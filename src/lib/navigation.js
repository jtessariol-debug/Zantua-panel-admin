import {
  BadgeDollarSign,
  CalendarDays,
  HandCoins,
  LayoutDashboard,
  Package,
  Settings,
  ShieldUser,
  Sparkles,
  UserRoundSearch,
  Users,
  WalletCards,
} from "lucide-react";
import { isAdminRole, isReceptionRole, isSpecialistRole } from "./roles";

export const NAVIGATION_SECTIONS = [
  {
    title: "PRINCIPAL",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "OPERACIONES",
    items: [
      { label: "Agenda", path: "/agenda", icon: CalendarDays },
      { label: "Pacientes", path: "/patients", icon: Users },
      { label: "Reactivación", path: "/patients/reactivation", icon: UserRoundSearch },
      { label: "Láser", path: "/laser", icon: Sparkles },
    ],
  },
  {
    title: "FINANZAS",
    items: [
      { label: "Facturación", path: "/billing", icon: WalletCards },
      { label: "Comisiones", path: "/commissions", icon: BadgeDollarSign },
      { label: "Nómina", path: "/payroll", icon: HandCoins },
      { label: "Inventario", path: "/inventory", icon: Package },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { label: "Usuarios", path: "/users", icon: ShieldUser },
      { label: "Configuración", path: "/settings", icon: Settings },
    ],
  },
];

export function getNavigationSections(role) {
  if (isAdminRole(role)) {
    return NAVIGATION_SECTIONS;
  }

  if (isReceptionRole(role)) {
    return NAVIGATION_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => ["/dashboard", "/agenda", "/patients", "/patients/reactivation", "/billing"].includes(item.path)),
      }))
      .filter((section) => section.items.length > 0);
  }

  if (isSpecialistRole(role)) {
    return NAVIGATION_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => ["/dashboard", "/agenda", "/patients", "/laser", "/billing"].includes(item.path)),
      }))
      .filter((section) => section.items.length > 0);
  }

  return NAVIGATION_SECTIONS;
}

export const SPECIALIST_SCHEDULES = [
  { name: "ANNERIS MELENCIANO", schedule: "Agenda abierta" },
  { name: "LEIDY LAURA HERNÁNDEZ", schedule: "7:30 AM - 3:30 PM" },
  { name: "PENELOPE LUNA", schedule: "7:30 AM - 3:30 PM" },
  { name: "RIQUEIMELIN ESPIRITUD", schedule: "7:30 AM - 3:30 PM" },
  { name: "RUT VERICUT", schedule: "12:00 PM - 8:00 PM" },
];
