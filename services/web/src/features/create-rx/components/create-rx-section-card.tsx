import type { ReactNode } from 'react';

interface CreateRxSectionCardProps {
  title?: string;
  children: ReactNode;
}

export function CreateRxSectionCard({ title, children }: CreateRxSectionCardProps) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      {title ? (
        <h3 className="mb-4 text-base font-semibold text-gray-700">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}
