import Image from 'next/image';

export function OrganizerSidebar() {
    return (
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
            <div className="flex-1" />
        </div>
    );
}
