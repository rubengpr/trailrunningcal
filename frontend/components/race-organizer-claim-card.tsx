'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { ClaimOrganizerModal } from './claim-organizer-modal';
import { ConfirmationModal } from './confirmation-modal';

interface RaceOrganizerClaimCardProps {
    title: string;
    titleMobile: string;
    description: string;
    descriptionMobile: string;
    benefits: string;
    claimButton: string;
}

export function RaceOrganizerClaimCard({
    title,
    titleMobile,
    description,
    descriptionMobile,
    benefits,
    claimButton,
}: RaceOrganizerClaimCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const t = useTranslations('race.claimConfirmation');

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
        if (user) {
            setIsConfirmationModalOpen(true);
        } else {
            setIsModalOpen(true);
        }
    };

    const handleConfirm = () => {
        toast.success(t('successMessage'));
        setIsConfirmationModalOpen(false);
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 sm:px-6 py-4 border-2 border-gray-300 rounded-xl bg-gray-100 gap-4 sm:gap-0">
                <div className="flex flex-row justify-start items-center gap-4">
                    <div className="flex flex-row w-16 h-16 sm:w-20 sm:h-20 justify-center items-center border-3 border-gray-300 rounded-full bg-gray-50 shrink-0">
                        <p className="text-2xl sm:text-3xl">🏁</p>
                    </div>
                    <div className="flex flex-col justify-start">
                        <h3 className="text-sm lg:text-lg font-semibold mb-1">
                            <span className="block sm:hidden">{titleMobile}</span>
                            <span className="hidden sm:block">{title}</span>
                        </h3>
                        <p className="text-xs sm:text-sm">
                            <span className="block sm:hidden">{descriptionMobile}</span>
                            <span className="hidden sm:block">
                                {description}
                                <br />
                                {benefits}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-row justify-end items-center w-full sm:w-auto">
                    <button
                        onClick={handleButtonClick}
                        className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer w-full sm:w-auto"
                    >
                        {claimButton}
                    </button>
                </div>
            </div>
            <ClaimOrganizerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
            <ConfirmationModal
                isOpen={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                onConfirm={handleConfirm}
                title={t('title')}
                message={t('message')}
                confirmButtonText={t('confirmButton')}
                cancelButtonText={t('cancelButton')}
            />
        </>
    );
}
