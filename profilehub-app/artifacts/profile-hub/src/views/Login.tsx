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
import { loginWithPassword } from "@/app/auth/actions";


const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default function Login({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const { t } = useLocale();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setMessage(null);
    const result = await loginWithPassword({ ...values, next: nextPath });
    if (!result.ok) {
      setMessage(result.message === "Invalid email or password." ? t("auth.invalidCredentials") : t("auth.loginFailed"));
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-7 p-4 pt-20 bg-muted/30">
      {/* Arriving here from the landing page should not feel like leaving the
          product. */}
      <Link href="/" className="transition-opacity hover:opacity-75">
        <Wordmark stacked />
      </Link>

      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-sm border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2">{t("auth.loginTitle")}</h1>
          <p className="text-muted-foreground">{t("auth.loginSubtitle")}</p>
        </div>

        <Button variant="outline" className="w-full mb-6" data-testid="btn-google-login" asChild>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /auth/google is a Route Handler that mints a PKCE pair; <Link> would prefetch it and desync the stored verifier from the challenge sent to Google. */}
          <a href={`/auth/google?next=${encodeURIComponent(nextPath)}`}>
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
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("auth.password")}</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">{t("auth.forgotPassword")}</Link>
                  </div>
                  <FormControl>
                    <Input type="password" {...field} data-testid="input-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {message && <p className="text-sm text-destructive">{message}</p>}
            <Button type="submit" className="w-full mt-6" data-testid="btn-submit-login">{t("auth.login")}</Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t("auth.noAccount")}{" "}<Link href="/register" className="text-primary hover:underline font-medium">{t("auth.register")}</Link>
        </p>
      </div>
    </div>
  );
}
