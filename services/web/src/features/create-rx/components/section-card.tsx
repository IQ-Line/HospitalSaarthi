import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';

interface SectionCardProps {
  title?: string;
  children: ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <Card className="gap-0 rounded-md border border-gray-200 py-4 shadow-sm ring-0">
      {title ? (
        <CardHeader className="px-4 pb-4">
          <CardTitle className="text-base font-semibold text-gray-700">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'px-4 pt-0' : 'px-4'}>{children}</CardContent>
    </Card>
  );
}
