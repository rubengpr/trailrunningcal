import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizerProfileForm } from '@/components/organizer-profile-form';

export default async function OrganizerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Server-side authentication check
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (error || !user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className='flex flex-row'>
      <div className="flex flex-col items-center w-1/8 h-screen pr-2 rounded-r-lg bg-gray-200 shadow-md/30">
        <Image
          src="https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg"
          width={60}
          height={60}
          alt="Trailruningcal.com logo"
          className="py-6"
        />
        <div className="flex flex-row w-full justify-start items-center px-6 py-2 gap-2 rounded-r-md hover:bg-gray-300 cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>

          <p className="text-sm">Perfil</p>
        </div>
      </div>
      <div className='flex flex-col w-full p-6'>
        <div className='flex flex-row mb-10'>
          <h1 className='text-xl font-bold'>Perfil</h1>
        </div>
        <OrganizerProfileForm userEmail={user.email || ''} />
      </div>
    </div>
  );
}
