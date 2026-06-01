"use client";

import { Sun, Moon, Globe, Menu, LogOut } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useTheme } from "@/components/ThemeProvider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import type { Profile } from "@/modules/shared";

function getInitials(name: string): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Topbar({ profile }: { profile?: Profile }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { setLanguage, t } = useTranslation();
  const displayName = profile?.displayName || "";
  const username = profile?.username || "";
  const avatarUrl = profile?.avatarUrl || "";

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" data-testid="mobile-menu">
          <Menu className="h-5 w-5" />
        </Button>
        {displayName && (
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">{displayName}</p>
            {username && (
              <p className="text-xs text-muted-foreground mt-0.5">@{username}</p>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {username && (
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden sm:flex"
            asChild
          >
            <Link href="/account/preview" target="_blank" prefetch={false} data-testid="preview-link">
              Preview Profile
            </Link>
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="language-toggle">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage("en")}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("ar")}>العربية</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          data-testid="theme-toggle"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="user-menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium leading-none">{displayName || "User"}</p>
                {username && <p className="text-xs text-muted-foreground">@{username}</p>}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" prefetch={false} className="cursor-pointer">{t("nav.profile")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" prefetch={false} className="cursor-pointer">{t("nav.settings")}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/auth/logout" className="cursor-pointer text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                {t("nav.logout")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
