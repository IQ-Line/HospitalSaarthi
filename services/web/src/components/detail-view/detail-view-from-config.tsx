import type { ReactNode } from 'react';
import { DetailViewColumns } from './detail-view-columns';
import { DetailViewSection, type DetailViewSectionProps } from './detail-view-section';

export type DetailViewFieldConfig<T> = {
  label: string;
  getValue: (data: T) => string;
  highlight?: boolean;
};

export type DetailViewSectionConfig<T> = {
  title: string;
  fields: readonly DetailViewFieldConfig<T>[];
  columns?: DetailViewSectionProps['columns'];
};

export type DetailViewLayoutConfig<T> = {
  left: readonly DetailViewSectionConfig<T>[];
  right: readonly DetailViewSectionConfig<T>[];
};

function sectionsFromConfig<T>(
  configs: readonly DetailViewSectionConfig<T>[],
  data: T,
): ReactNode {
  return configs.map((section) => (
    <DetailViewSection
      key={section.title}
      title={section.title}
      columns={section.columns}
      fields={section.fields.map((field) => ({
        label: field.label,
        value: field.getValue(data),
        highlight: field.highlight,
      }))}
    />
  ));
}

/** Renders a two-column detail layout from declarative section config. */
export function DetailViewFromConfig<T>({
  config,
  data,
}: {
  config: DetailViewLayoutConfig<T>;
  data: T;
}) {
  return (
    <DetailViewColumns
      left={sectionsFromConfig(config.left, data)}
      right={sectionsFromConfig(config.right, data)}
    />
  );
}
