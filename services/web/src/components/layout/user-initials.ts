export function getUserInitials(displayName: string | null): string {
  if (!displayName?.trim()) {
    return '?';
  }
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
  }
  return parts[0]!.slice(0, 2).toUpperCase();
}
