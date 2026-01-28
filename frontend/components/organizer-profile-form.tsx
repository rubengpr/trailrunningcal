'use client';

import { useState } from 'react';
import { FormInput } from './form-input';

interface OrganizerProfileFormProps {
    userEmail: string;
}

export function OrganizerProfileForm({ userEmail }: OrganizerProfileFormProps) {
    const [userName, setUserName] = useState('');
    const [userRole, setuserRole] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [organizationWebsite, setOrganizationWebsite] = useState('');
    const [facebookUrl, setFacebookUrl] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [tiktokUrl, setTiktokUrl] = useState('');

    return (
        <div className='flex flex-col p-6 gap-10'>
            <div className='flex flex-col gap-4'>
                <h3 className="text-xl font-semibold leading-none tracking-tight">
                    Usuario
                </h3>
                <div className="grid grid-cols-2 gap-8">
                    <FormInput
                        id='fullname'
                        label='Nombre completo'
                        type='text'
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                    />
                    <FormInput
                        id='email'
                        label='Email'
                        type='email'
                        value={userEmail}
                        disabled
                    />
                    <FormInput
                        id='role'
                        label='Cargo'
                        type='text'
                        value={userRole}
                        onChange={(e) => setuserRole(e.target.value)}
                    />
                </div>
            </div>


            {/* Organization Data Box */}
            <div className='flex flex-col gap-4'>
                <h3 className="text-xl font-semibold leading-none tracking-tight">
                    Organización
                </h3>
                <div className="grid grid-cols-2 gap-8">
                    <FormInput
                        id='organizationName'
                        label='Nombre'
                        type='text'
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                    />
                    <FormInput
                        id='organizationWebsite'
                        label='Sitio web'
                        type='url'
                        value={organizationWebsite}
                        placeholder='https://sitioweb.com/'
                        onChange={(e) => setOrganizationWebsite(e.target.value)}
                    />
                    <FormInput
                        id='facebookUrl'
                        label='Facebook'
                        type='url'
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                    />
                    <FormInput
                        id='instagramUrl'
                        label='Instagram'
                        type='url'
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                    />
                    <FormInput
                        id='youtubeUrl'
                        label='YouTube'
                        type='url'
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                    <FormInput
                        id='tiktokUrl'
                        label='TikTok'
                        type='url'
                        value={tiktokUrl}
                        onChange={(e) => setTiktokUrl(e.target.value)}
                    />
                </div>
            </div>
            <div className='flex justify-end'>
                <button
                    type='button'
                    className='inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer'
                >
                    Guardar cambios
                </button>
            </div>
        </div>
    );
}
