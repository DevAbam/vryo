import {
  AudioLines,
  Bell,
  House,
  Mail,
  MonitorPlay,
  Search,
  Settings,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** The three content pillars. Top tabs below `lg`, sidebar items from `lg`. */
export const SECTION_TABS: NavItem[] = [
  { href: "/feed", label: "Feed", icon: House },
  { href: "/stream", label: "Stream", icon: MonitorPlay },
  { href: "/spaces", label: "Spaces", icon: AudioLines },
];

/** Mobile bottom navigation, as in the inspo. */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/feed", label: "Home", icon: House },
  { href: "/search", label: "Search", icon: Search },
  { href: "/competitions", label: "Competitions", icon: Trophy },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/messages", label: "Messages", icon: Mail },
];

/** Tablet rail and desktop sidebar. */
export const SIDEBAR_NAV: NavItem[] = [
  ...SECTION_TABS,
  { href: "/search", label: "Search", icon: Search },
  { href: "/competitions", label: "Competitions", icon: Trophy },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
