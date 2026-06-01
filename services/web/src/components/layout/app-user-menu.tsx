import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@pulse/ui/avatar';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import { useLogout } from '@/components/layout/use-logout';

function initialsFromDisplayName(displayName: string | null): string {
  if (!displayName?.trim()) {
    return '?';
  }
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface AppUserMenuProps {
  displayName: string | null;
}

export function AppUserMenu({ displayName }: AppUserMenuProps) {
  const { logout, loggingOut } = useLogout();
  const initials = initialsFromDisplayName(displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full size-10 p-0 hover:bg-black/5"
          aria-label="User menu"
        >
          <Avatar size="lg" className="size-9">
            <AvatarFallback className="bg-[#3AA9A0] text-white text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[1100]">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium leading-none">{displayName ?? 'User'}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={loggingOut}
          onClick={() => void logout()}
        >
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
