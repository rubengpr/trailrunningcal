'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { FormInput } from './form-input';
import { updateProfile } from '@/lib/api/profiles';

interface OrganizerProfileFormProps {
    userEmail: string;
}

export function OrganizerProfileForm({ userEmail }: OrganizerProfileFormProps) {
    const t = useTranslations('organizer.profile');
    const [userName, setUserName] = useState('');
    const [userRole, setuserRole] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [organizationWebsite, setOrganizationWebsite] = useState('');
    const [facebookUrl, setFacebookUrl] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [tiktokUrl, setTiktokUrl] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await updateProfile({ userName, userRole });

            toast.success(t('success'));
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : t('errors.general');
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className='flex flex-col p-6 gap-10'>
            <div className='flex flex-col gap-4'>
                <h3 className="text-xl font-semibold leading-none tracking-tight">
                    {t('user.sectionTitle')}
                </h3>
                <div className="grid grid-cols-2 gap-8">
                    <FormInput
                        id='fullname'
                        label={t('user.fullName')}
                        type='text'
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                    />
                    <FormInput
                        id='email'
                        label={t('user.email')}
                        type='email'
                        value={userEmail}
                        disabled
                    />
                    <FormInput
                        id='role'
                        label={t('user.role')}
                        type='text'
                        value={userRole}
                        onChange={(e) => setuserRole(e.target.value)}
                    />
                </div>
            </div>


            {/* Organization Data Box */}
            <div className='flex flex-col gap-4'>
                <h3 className="text-xl font-semibold leading-none tracking-tight">
                    {t('organization.sectionTitle')}
                </h3>
                <div className="grid grid-cols-2 gap-8">
                    <FormInput
                        id='organizationName'
                        label={t('organization.name')}
                        type='text'
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                    />
                    <FormInput
                        id='organizationWebsite'
                        label={t('organization.website')}
                        type='url'
                        value={organizationWebsite}
                        placeholder='https://sitioweb.com/'
                        onChange={(e) => setOrganizationWebsite(e.target.value)}
                    />
                    <FormInput
                        id='facebookUrl'
                        label={t('organization.facebook')}
                        type='url'
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                    />
                    <FormInput
                        id='instagramUrl'
                        label={t('organization.instagram')}
                        type='url'
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                    />
                    <FormInput
                        id='youtubeUrl'
                        label={t('organization.youtube')}
                        type='url'
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                    <FormInput
                        id='tiktokUrl'
                        label={t('organization.tiktok')}
                        type='url'
                        value={tiktokUrl}
                        onChange={(e) => setTiktokUrl(e.target.value)}
                    />
                </div>
            </div>
            <div className='flex justify-end'>
                <button
                    type='submit'
                    className='inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer'
                    disabled={isLoading}
                >
                    {isLoading ? t('saving') : t('saveChanges')}
                </button>
            </div>
            {error && (
                <p className='text-sm text-red-500'>{error}</p>
            )}
        </form>
    );
}
