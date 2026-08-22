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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-lyp-black text-white shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-lyp-black text-white flex flex-col transition-all duration-300",
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="border-b border-white/10 p-3">
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
              className="lg:hidden p-1 rounded hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Collapse on desktop */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block p-1 rounded hover:bg-white/10"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                className={cn(
                  "h-5 w-5 transition-transform",
                  collapsed && "rotate-180",
                )}
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-lyp-cherry text-white"
                        : "text-gray-300 hover:bg-white/10 hover:text-white",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </AdminLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer / User */}
        <div className="border-t border-white/10 p-4">
          {!collapsed && userEmail && (
            <p className="text-xs text-gray-400 truncate mb-2">{userEmail}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white w-full transition-colors"
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
