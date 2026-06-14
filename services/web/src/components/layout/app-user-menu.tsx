import { LogOut, User } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';
import { APP_AVATAR_BG_CLASS } from '@/components/layout/layout-constants';
import { useLogout } from '@/components/layout/use-logout';
import { getUserInitials } from '@/components/layout/user-initials';
import { formatPrincipalRoleLabels } from '@/lib/principal-roles';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

interface AppUserMenuProps {
  displayName: string | null;
}

export function AppUserMenu({ displayName }: AppUserMenuProps) {
  const { logout, loggingOut } = useLogout();
  const initials = getUserInitials(displayName);
  const principalRoles = usePermissionsStore((s) => s.roles);
  const authRoles = useAuthStore((s) => s.roles);
  const roleLabel = formatPrincipalRoleLabels(principalRoles, authRoles);
  const name = displayName?.trim() || 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-full p-0 hover:bg-white/60"
          aria-label={`Account menu for ${name}${roleLabel ? `, ${roleLabel}` : ''}`}
        >
          <span
            className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white ${APP_AVATAR_BG_CLASS}`}
          >
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium leading-none">{name}</p>
          {roleLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Signed in</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-2">
          <User className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive"
          disabled={loggingOut}
          onSelect={(event) => {
            event.preventDefault();
            void logout();
          }}
        >
          <LogOut className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
