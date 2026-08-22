"use client";

import AdminLink from "@/components/admin/AdminLink";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BookOpen,
  Camera,
  MapPin,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  CircleQuestionMarkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

const EASE = "ease-brand";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Proposals", icon: FileText, href: "/admin/proposals" },
  { label: "Clients", icon: Users, href: "/admin/clients" },
  { label: "Services", icon: Package, href: "/admin/services" },
  { label: "Content Pages", icon: BookOpen, href: "/admin/pages" },
  {
    label: "Intake Questions",
    icon: CircleQuestionMarkIcon,
    href: "/admin/intake-questions",
  },
  { label: "Providers", icon: Camera, href: "/admin/providers" },
  { label: "Venues", icon: MapPin, href: "/admin/venues" },
  { label: "States", icon: MapPin, href: "/admin/states" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

interface SidebarProps {
  userEmail?: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    // Post to a logout endpoint or call server action
    const res = await fetch("/api/admin/logout", { method: "POST" });
    if (res.ok) window.location.href = "/admin/login";
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-lyp-black text-lyp-white shadow-[0_10px_30px_-12px_rgba(61,11,17,0.5)] transition-transform duration-500 lg:hidden ${EASE} active:scale-95`}
        aria-label="Open menu"
      >
        <Menu strokeWidth={1.5} className="h-4 w-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-lyp-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          `fixed left-0 top-0 z-40 flex h-screen flex-col bg-lyp-black font-body text-lyp-white transition-all duration-500 ${EASE}`,
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="border-b border-lyp-white/[0.08] p-3">
          {/* The logo gets its own full-width row so it is not competing with
              the controls for horizontal space. */}
          {!collapsed && (
            <Logo onDark fullWidth className="" priority />
          )}
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "mt-2 justify-end",
            )}
          >
            {/* Close on mobile */}
            <button
              onClick={() => setMobileOpen(false)}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-lyp-white/60 transition-colors duration-500 lg:hidden ${EASE} hover:bg-lyp-white/10 hover:text-lyp-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-white/40`}
              aria-label="Close menu"
            >
              <X strokeWidth={1.5} className="h-4 w-4" />
            </button>
            {/* Collapse on desktop */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`hidden h-7 w-7 items-center justify-center rounded-full text-lyp-white/60 transition-colors duration-500 lg:flex ${EASE} hover:bg-lyp-white/10 hover:text-lyp-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-white/40`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                strokeWidth={1.5}
                className={cn(
                  `h-4 w-4 transition-transform duration-500 ${EASE}`,
                  collapsed && "rotate-180",
                )}
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {!collapsed && (
            <p className="px-5 pb-2.5 text-[9px] font-medium uppercase tracking-[0.28em] text-lyp-white/30">
              Manage
            </p>
          )}
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <AdminLink
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      `flex items-center gap-3 rounded-full px-3 py-2.5 text-[12.5px] font-medium tracking-wide transition-all duration-500 ${EASE} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-white/40`,
                      collapsed && "justify-center",
                      active
                        ? "bg-lyp-cherry text-lyp-white shadow-[0_10px_28px_-12px_rgba(178,38,38,0.7)]"
                        : "text-lyp-white/60 hover:bg-lyp-white/[0.07] hover:text-lyp-white",
                    )}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                  >
                    <Icon
                      strokeWidth={1.5}
                      className="h-[18px] w-[18px] flex-shrink-0"
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </AdminLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer / User */}
        <div className="border-t border-lyp-white/[0.08] p-3">
          {!collapsed && userEmail && (
            <p className="mb-2 truncate px-3 text-[11px] text-lyp-white/40">
              {userEmail}
            </p>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              `flex w-full items-center gap-3 rounded-full px-3 py-2 text-[12.5px] font-medium tracking-wide text-lyp-white/60 transition-all duration-500 ${EASE} hover:bg-lyp-white/[0.07] hover:text-lyp-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-white/40`,
              collapsed && "justify-center",
            )}
            title={collapsed ? "Logout" : undefined}
            aria-label={collapsed ? "Logout" : undefined}
          >
            <LogOut strokeWidth={1.5} className="h-[18px] w-[18px] flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
