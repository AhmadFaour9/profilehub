"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
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
      if (code === "invalid_config") uiMessage = "System configuration error. Please try again later.";
      else if (code === "username_taken") uiMessage = "This username is already taken. Please choose another.";
      else if (code === "email_signup_disabled") uiMessage = "Email signup is currently disabled.";
      else if (code === "profile_creation_failed") uiMessage = "Could not initialize your profile. Please contact support.";
      else uiMessage = code || "An unexpected error occurred.";
      setMessage(`DEBUG_REGISTER_ERROR: ${uiMessage}`);
    } else {
      setMessage(result.message || "Account created.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-sm border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2">Create your account</h1>
          <p className="text-muted-foreground">Start building your premium identity</p>
        </div>

        <Button variant="outline" className="w-full mb-6" data-testid="btn-google-register" asChild>
          <Link href="/auth/google?next=/onboarding">
            <SiGoogle className="mr-2 h-4 w-4" />
            Sign up with Google
          </Link>
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
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
                  <FormLabel>Email</FormLabel>
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} data-testid="input-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {message && <p className={message.includes("Check") || message.includes("created") ? "text-sm text-primary" : "text-sm text-destructive"}>{message}</p>}
            <Button type="submit" className="w-full mt-6" data-testid="btn-submit-register">Create Account</Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}
