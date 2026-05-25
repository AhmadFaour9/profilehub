"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2 } from "lucide-react";
import { sendPasswordReset } from "@/app/auth/actions";

const formSchema = z.object({
  email: z.string().email(),
});

export default function ForgotPassword() {
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-sm border">
        {isSubmitted ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif mb-2">Check your email</h1>
              <p className="text-muted-foreground">
                We've sent a password reset link to <span className="font-medium text-foreground">{form.getValues().email}</span>
              </p>
            </div>
            <Button className="w-full" asChild>
              <Link href="/login">Return to log in</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif mb-2">Reset password</h1>
              <p className="text-muted-foreground">Enter your email and we'll send you a reset link</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {message && <p className="text-sm text-destructive">{message}</p>}
                <Button type="submit" className="w-full mt-6" data-testid="btn-submit-reset">Send reset link</Button>
              </form>
            </Form>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-sm text-primary hover:underline font-medium">
                Back to log in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
