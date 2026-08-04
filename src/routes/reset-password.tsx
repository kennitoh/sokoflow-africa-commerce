import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — SokoFlow" },
      { name: "description", content: "Choose a new password for your SokoFlow account." },
      { property: "og:title", content: "Set a new password — SokoFlow" },
      { property: "og:description", content: "Choose a new SokoFlow password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      password: String(form.get("password") ?? ""),
      confirm: String(form.get("confirm") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your password");
      return;
    }
    setLoading(true);
    try {
      await authService.updatePassword(parsed.data.password);
      toast.success("Password updated");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      description="Choose a strong password you don't use anywhere else."
      footer={
        <Link to="/auth" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />} Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
