import type { ReactNode } from 'react';
import { cn } from '@pulse/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';

interface SectionCardProps {
  title?: string;
  hasError?: boolean;
  children: ReactNode;
}

export function SectionCard({ title, children, hasError = false }: SectionCardProps) {
  return (
    <Card
      className={cn(
        'gap-0 rounded-md border py-4 shadow-sm ring-0',
        hasError ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
      )}
    >
      {title ? (
        <CardHeader className="px-4 pb-4">
          <CardTitle
            className={cn(
              'text-base font-semibold',
              hasError ? 'text-red-700' : 'text-gray-700',
            )}
          >
            {title}
          </CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'px-4 pt-0' : 'px-4'}>{children}</CardContent>
    </Card>
  );
}
