import { ReactNode } from 'react';
import { OrganizerSidebar } from './organizer-sidebar';

interface OrganizerLayoutProps {
  children: ReactNode;
}

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row">
      <OrganizerSidebar />
      <div className="flex flex-col w-full p-6">
        {children}
      </div>
    </div>
  );
}
