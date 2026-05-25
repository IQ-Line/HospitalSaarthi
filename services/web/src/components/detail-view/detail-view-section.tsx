import { cn } from '@pulse/utils';
import { DetailViewField, type DetailViewFieldProps } from './detail-view-field';

export interface DetailViewSectionProps {
  title: string;
  fields: readonly Pick<DetailViewFieldProps, 'label' | 'value' | 'highlight'>[];
  columns?: 1 | 2;
  className?: string;
}

export function DetailViewSection({
  title,
  fields,
  columns = 2,
  className,
}: DetailViewSectionProps) {
  return (
    <section className={cn('mb-8 last:mb-0', className)}>
      <h3 className="mb-4 text-lg font-semibold text-[#2563EB]">{title}</h3>
      <div
        className={cn('grid gap-4', columns === 2 ? 'grid-cols-2' : 'grid-cols-1')}
      >
        {fields.map((field) => (
          <DetailViewField key={field.label} {...field} />
        ))}
      </div>
    </section>
  );
}
