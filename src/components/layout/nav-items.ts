import {
  BusFrontIcon,
  CameraIcon,
  ChartNoAxesColumnIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    description: "Daily overview",
  },
  {
    href: "/sightings",
    label: "Sightings",
    icon: CameraIcon,
    description: "Every observation",
  },
  {
    href: "/fleet",
    label: "Fleet database",
    icon: BusFrontIcon,
    description: "Vehicles and specs",
  },
  {
    href: "/map",
    label: "Map",
    icon: MapPinIcon,
    description: "Spotting locations",
  },
  {
    href: "/gallery",
    label: "Photo gallery",
    icon: ImagesIcon,
    description: "The archive",
  },
  {
    href: "/stats",
    label: "Statistics",
    icon: ChartNoAxesColumnIcon,
    description: "Patterns and coverage",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/operators", label: "Operators", icon: UsersIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];
