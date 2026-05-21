import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeft,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardSignature,
  Columns2,
  ConciergeBell,
  Database,
  FlaskConical,
  HeartPulse,
  Layers,
  LayoutGrid,
  Link2,
  PillBottle,
  Ruler,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Syringe,
  Users,
} from 'lucide-react';

/** Maps manifest `icon` string keys to Lucide components. */
export const NAVIGATION_ICONS: Record<string, LucideIcon> = {
  'layout-grid': LayoutGrid,
  users: Users,
  database: Database,
  'shield-check': ShieldCheck,
  link: Link2,
  'concierge-bell': ConciergeBell,
  'clipboard-signature': ClipboardSignature,
  'calendar-days': CalendarDays,
  layers: Layers,
  ruler: Ruler,
  'arrow-right-left': ArrowRightLeft,
  'heart-pulse': HeartPulse,
  'book-open': BookOpen,
  stethoscope: Stethoscope,
  syringe: Syringe,
  'shield-alert': ShieldAlert,
  'columns-2': Columns2,
  'pill-bottle': PillBottle,
  'calendar-clock': CalendarClock,
  scissors: Scissors,
  'flask-conical': FlaskConical,
  building: Building2,
  'sliders-horizontal': SlidersHorizontal,
};

export function resolveNavigationIcon(iconKey?: string): LucideIcon | undefined {
  if (!iconKey) return undefined;
  return NAVIGATION_ICONS[iconKey];
}
