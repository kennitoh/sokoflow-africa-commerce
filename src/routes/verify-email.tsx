import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify-email")({
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verify your email — SokoFlow" },
      { name: "description", content: "Confirm your email address to activate your SokoFlow workspace." },
      { property: "og:title", content: "Verify your email — SokoFlow" },
      { property: "og:description", content: "Confirm your email to activate SokoFlow." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmail,
});

function VerifyEmail() {
  const { email } = Route.useSearch();

  return (
    <AuthLayout
      title="Verify your email"
      description="One quick step before your workspace opens."
      footer={
        <span>
          Already confirmed?{" "}
          <Link to="/auth" className="text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <div className="surface-card space-y-4 p-6 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
          <MailCheck className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold">Confirmation link sent</p>
          <p className="text-xs text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email ?? "your email address"}</span>. Open
            it to finish setting up SokoFlow.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/auth">Back to sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
