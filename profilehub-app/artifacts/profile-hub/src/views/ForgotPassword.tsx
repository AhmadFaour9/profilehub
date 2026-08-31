"use client";

import { useLocale } from "@/lib/i18n/client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Wordmark } from "@/components/HubMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2 } from "lucide-react";
import { sendPasswordReset } from "@/app/auth/actions";

const formSchema = z.object({
  email: z.string().email(),
});

export default function ForgotPassword() {
  const { t } = useLocale();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setMessage(null);
    const result = await sendPasswordReset(values.email);
    if (result.ok) setIsSubmitted(true);
    else setMessage(result.message || "Could not send reset email.");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-7 p-4 pt-20 bg-muted/30">
      {/* Arriving here from the landing page should not feel like leaving the
          product. */}
      <Link href="/" className="text-lg transition-opacity hover:opacity-75">
        <Wordmark />
      </Link>

      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-sm border">
        {isSubmitted ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif mb-2">{t("auth.checkEmail")}</h1>
              <p className="text-muted-foreground">
                {t("auth.resetLinkSent")}{" "}
                <span className="font-medium text-foreground">{form.getValues().email}</span>
              </p>
            </div>
            <Button className="w-full" asChild>
              <Link href="/login">{t("auth.login")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif mb-2">{t("auth.resetPassword")}</h1>
              <p className="text-muted-foreground">{t("auth.resetHint")}</p>
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
                {message && <p className="text-sm text-destructive">{message}</p>}
                <Button type="submit" className="w-full mt-6" data-testid="btn-submit-reset">{t("auth.sendResetLink")}</Button>
              </form>
            </Form>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-sm text-primary hover:underline font-medium">
                {t("authStatus.backToLogin")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
