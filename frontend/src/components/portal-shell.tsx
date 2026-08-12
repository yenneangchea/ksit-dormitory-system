'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { UserRole } from '@/types';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin Portal' },
  { value: 'manager', label: 'Manager Portal' },
  { value: 'teacher', label: 'Teacher Portal' },
  { value: 'student', label: 'Student Portal' },
];

export function PortalShell({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="ksit-shell">
      <header className="border-b border-[#dfe5df] bg-white">
        <div className="ksit-container flex min-h-[76px] flex-col justify-center gap-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/ksit-logo.png" alt="KSIT official logo" width={44} height={44} priority className="size-11 shrink-0 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-[-0.025em] text-[#18231d] sm:text-base">KSIT Dormitory Management System</p>
              <p className="truncate text-[11px] text-[#68736c] sm:text-xs">Kampong Speu Institute of Technology · Smart residence operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <label className="hidden text-xs font-semibold text-[#68736c] sm:block" htmlFor="language">Language</label>
            <select id="language" className="ksit-control w-[101px] appearance-auto" defaultValue="English" aria-label="Language">
              <option>English</option>
              <option>Khmer</option>
            </select>
            <select
              className="ksit-control w-[150px] appearance-auto"
              value={role}
              aria-label="Role switcher"
              onChange={(event) => router.push(`/dashboard/${event.target.value}`)}
            >
              {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
      </header>
      <main className="ksit-container flex-1 py-8 sm:py-9">{children}</main>
      <footer className="mt-auto border-t border-[#dfe5df] bg-[#fbfcfa] py-4 text-center text-[10px] text-[#758078] sm:text-xs">
        KSIT Dormitory Management System · Kampong Speu Institute of Technology
      </footer>
    </div>
  );
}

export const roleDisplayName: Record<UserRole, string> = {
  admin: 'Admin Portal',
  manager: 'Manager Portal',
  teacher: 'Teacher Portal',
  student: 'Student Portal',
};
