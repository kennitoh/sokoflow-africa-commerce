import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authService } from "@/services/auth.service";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SokoFlow" },
      { name: "description", content: "Sign in or create your SokoFlow commerce workspace." },
      { property: "og:title", content: "Sign in — SokoFlow" },
      { property: "og:description", content: "Access your SokoFlow commerce workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().min(2, "Enter your name"),
  businessName: z.string().min(2, "Enter your business name"),
});

function GoogleButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setSigningIn(true);
    try {
      await authService.signIn(parsed.data);
      toast.success("Welcome back to SokoFlow");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: String(form.get("fullName") ?? ""),
      businessName: String(form.get("businessName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setSigningUp(true);
    try {
      const result = await authService.signUp(parsed.data);
      if (result.session) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      navigate({ to: "/verify-email", search: { email: parsed.data.email } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your account");
    } finally {
      setSigningUp(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome to SokoFlow"
      description="Run your business. Sell with confidence."
    >
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-6 space-y-4">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input id="signin-email" name="email" type="email" autoComplete="email" placeholder="you@business.co" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="signin-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={signingIn}>
              {signingIn && <Loader2 className="size-4 animate-spin" />} Sign in
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <GoogleButton label="Continue with Google" />
        </TabsContent>

        <TabsContent value="signup" className="mt-6 space-y-4">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full name</Label>
              <Input id="signup-name" name="fullName" autoComplete="name" placeholder="Amina Otieno" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-business">Business name</Label>
              <Input id="signup-business" name="businessName" autoComplete="organization" placeholder="Soko Fresh Ltd" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@business.co" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={signingUp}>
              {signingUp && <Loader2 className="size-4 animate-spin" />} Create workspace
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <GoogleButton label="Sign up with Google" />
        </TabsContent>
      </Tabs>
    </AuthLayout>
  );
}
