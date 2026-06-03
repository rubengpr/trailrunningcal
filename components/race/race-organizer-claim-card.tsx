'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { ClaimOrganizerModal } from '@/components/organizer/claim-organizer-modal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { claimOrganizer } from '@/app/actions/claim-organizer';

interface RaceOrganizerClaimCardProps {
    claimButton: string;
    label: string;
    raceName: string;
    resourceType?: 'race' | 'event';
    claimModalNamespace?: string;
    confirmationNamespace?: string;
}

export function RaceOrganizerClaimCard({
    claimButton,
    label,
    raceName,
    resourceType = 'race',
    claimModalNamespace = 'race.claimModal',
    confirmationNamespace = 'race.claimConfirmation',
}: RaceOrganizerClaimCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const t = useTranslations(confirmationNamespace);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const supabase = createClient();
                const { data: { user: authUser }, error } = await supabase.auth.getUser();
                if (error || !authUser) {
                    setUser(null);
                } else {
                    setUser(authUser);
                }
            } catch {
                setUser(null);
            }
        };

        checkAuth();
    }, []);

    const handleButtonClick = () => {
        if (resourceType === 'event') {
            track(ANALYTICS_EVENTS.EVENT_ORGANIZER_CLAIM_CLICKED, { event_name: raceName });
        } else {
            track(ANALYTICS_EVENTS.RACE_ORGANIZER_CLAIM_CLICKED, { race_name: raceName });
        }
        if (user) {
            setIsConfirmationModalOpen(true);
        } else {
            setIsModalOpen(true);
        }
    };

    const handleConfirm = async () => {
        if (!raceName) {
            toast.error('Race name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            await claimOrganizer(raceName, resourceType);
            toast.success(t('successMessage'));
            setIsConfirmationModalOpen(false);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to send claim request. Please try again later.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <p className="text-xs text-gray-400 text-center">
                {label}{' '}
                <button
                    onClick={handleButtonClick}
                    className="underline hover:text-gray-600 transition-colors cursor-pointer"
                >
                    {claimButton}
                </button>
            </p>
            <ClaimOrganizerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                translationNamespace={claimModalNamespace}
            />
            <ConfirmationModal
                isOpen={isConfirmationModalOpen}
                onClose={() => !isSubmitting && setIsConfirmationModalOpen(false)}
                onConfirm={handleConfirm}
                title={t('title')}
                message={t('message')}
                confirmButtonText={isSubmitting ? 'Enviando...' : t('confirmButton')}
                cancelButtonText={t('cancelButton')}
                isSubmitting={isSubmitting}
            />
        </>
    );
}
