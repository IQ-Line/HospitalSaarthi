import { Search } from 'lucide-react';
import { Input } from '@pulse/ui/input';

interface MasterDataTableToolbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MasterDataTableToolbar({
  value,
  onChange,
  placeholder = 'Search…',
}: MasterDataTableToolbarProps) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
        aria-label="Search table"
      />
    </div>
  );
}
