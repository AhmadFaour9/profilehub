"use client";

import { useLocale } from "@/lib/i18n/client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Wordmark } from "@/components/HubMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SiGoogle } from "react-icons/si";
import { registerWithPassword } from "@/app/auth/actions";


const formSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

export default function Register() {
  const { t } = useLocale();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setMessage(null);
    const result = await registerWithPassword(values);
    if (!result.ok) {
      const code = result.message;
      let uiMessage = "An unexpected error occurred.";
      if (code === "public_supabase_missing" || code === "service_role_missing" || code === "service_role_invalid") {
        uiMessage = "System configuration error. Please try again later.";
      } else if (code === "username_taken") uiMessage = "This username is already taken. Please choose another.";
      else if (code === "auth_signup_failed") uiMessage = "Could not create your account. Please try again.";
      else if (code === "profile_insert_failed") uiMessage = "Could not initialize your profile. Please contact support.";
      else if (code === "schema_mismatch") uiMessage = "Database setup is incomplete. Please contact support.";
      else uiMessage = code || "An unexpected error occurred.";
      setMessage(uiMessage);
    } else {
      setMessage(result.message === "register_success" ? "Check your email to confirm your account." : result.message || "Account created.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-7 p-4 pt-20 bg-muted/30">
      {/* Arriving here from the landing page should not feel like leaving the
          product. */}
      <Link href="/" className="text-xl transition-opacity hover:opacity-75">
        <Wordmark />
      </Link>

      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-sm border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2">{t("auth.registerTitle")}</h1>
          <p className="text-muted-foreground">{t("auth.registerSubtitle")}</p>
        </div>

        <Button variant="outline" className="w-full mb-6" data-testid="btn-google-register" asChild>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /auth/google is a Route Handler that mints a PKCE pair; <Link> would prefetch it and desync the stored verifier from the challenge sent to Google. */}
          <a href="/auth/google?next=/onboarding">
            <SiGoogle className="mr-2 h-4 w-4" />
            {t("auth.continueWithGoogle")}
          </a>
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("auth.or")}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profile.username")}</FormLabel>
                  <FormControl>
                    <Input placeholder="your-name" {...field} data-testid="input-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.email")}</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.password")}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} data-testid="input-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {message && <p className={message.includes("Check") || message.includes("created") ? "text-sm text-primary" : "text-sm text-destructive"}>{message}</p>}
            <Button type="submit" className="w-full mt-6" data-testid="btn-submit-register">{t("auth.register")}</Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t("auth.haveAccount")}{" "}<Link href="/login" className="text-primary hover:underline font-medium">{t("auth.login")}</Link>
        </p>
      </div>
    </div>
  );
}
