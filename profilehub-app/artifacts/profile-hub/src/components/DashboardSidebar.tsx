"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";
import { LayoutDashboard, User, Link as LinkIcon, Briefcase, Box, Image, Palette, BarChart, Settings, LogOut, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

export function DashboardSidebar({ variant = "desktop", onNavigate }: DashboardSidebarProps) {
  const location = usePathname();
  const { t } = useTranslation();
  const isMobile = variant === "mobile";

  const links = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/profile", label: t("nav.profile"), icon: User },
    { href: "/dashboard/links", label: t("nav.links"), icon: LinkIcon },
    { href: "/dashboard/projects", label: t("nav.projects"), icon: Briefcase },
    { href: "/dashboard/services", label: t("nav.services"), icon: Box },
    { href: "/dashboard/skills", label: t("nav.skills"), icon: Sparkles },
    { href: "/dashboard/gallery", label: t("nav.gallery"), icon: Image },
    { href: "/dashboard/theme", label: t("nav.theme"), icon: Palette },
    { href: "/dashboard/analytics", label: t("nav.analytics"), icon: BarChart },
    { href: "/dashboard/resume", label: t("nav.resume"), icon: FileText },
    { href: "/dashboard/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "w-full bg-sidebar border-sidebar-border flex-col",
        isMobile ? "flex h-full border-r" : "hidden md:flex md:w-64 border-r"
      )}
    >
      <div className="p-6">
        <h2 className="text-xl font-serif font-bold text-sidebar-foreground">ProfileHub</h2>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => {
          const isActive = location === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              prefetch={false}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
              data-testid={`nav-${link.href.replace("/dashboard", "") || "overview"}`}
              onClick={onNavigate}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Link
          href="/auth/logout"
          prefetch={false}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          data-testid="nav-logout"
          onClick={onNavigate}
        >
          <LogOut className="w-4 h-4" />
          {t("nav.logout")}
        </Link>
      </div>
    </aside>
  );
}
