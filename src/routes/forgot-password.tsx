import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — SokoFlow" },
      { name: "description", content: "Request a password reset link for your SokoFlow account." },
      { property: "og:title", content: "Reset your password — SokoFlow" },
      { property: "og:description", content: "Request a SokoFlow password reset link." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPassword,
});

const schema = z.object({ email: z.string().email("Enter a valid email address") });

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({ email: String(form.get("email") ?? "") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }
    setLoading(true);
    try {
      await authService.requestPasswordReset(parsed.data.email);
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="We'll email you a secure link to set a new one."
      footer={
        <span>
          Remembered it?{" "}
          <Link to="/auth" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </span>
      }
    >
      {sent ? (
        <div className="surface-card flex flex-col items-center gap-3 p-6 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <MailCheck className="size-5" />
          </span>
          <p className="text-sm font-semibold">Check your inbox</p>
          <p className="text-xs text-muted-foreground">
            If an account exists for that email, a reset link is on its way.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@business.co" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
