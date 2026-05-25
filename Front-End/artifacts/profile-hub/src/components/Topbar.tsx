"use client";

import { Sun, Moon, Globe, Menu } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { mockUser } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import type { Profile } from "@/modules/shared";

export function Topbar({ profile = mockUser }: { profile?: Profile }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { setLanguage } = useTranslation();

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" data-testid="mobile-menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="hidden sm:flex"
          asChild
        >
          <Link href={`/${profile.username}`} target="_blank" data-testid="preview-link">
            Preview Profile
          </Link>
        </Button>
        
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

        <Avatar className="h-8 w-8">
          <AvatarImage src={profile.avatarUrl || ""} alt={profile.displayName} />
          <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
