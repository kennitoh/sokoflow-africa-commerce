import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, LineChart, Package, ShoppingCart, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BRAND } from "@/config/navigation";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SokoFlow — Run your business. Sell with confidence." },
      {
        name: "description",
        content:
          "SokoFlow is the commerce operating system for African SMBs: products, orders, customers and inventory in one fast workspace.",
      },
      { property: "og:title", content: "SokoFlow — Run your business. Sell with confidence." },
      {
        property: "og:description",
        content: "One beautiful workspace for products, orders, customers and inventory.",
      },
    ],
  }),
  component: Landing,
});

const pillars = [
  { icon: Package, title: "Products", copy: "A clean catalogue your whole team understands." },
  { icon: ShoppingCart, title: "Orders", copy: "Track every sale from placed to fulfilled." },
  { icon: Users, title: "Customers", copy: "Know who buys, how often and what next." },
  { icon: Boxes, title: "Inventory", copy: "Stay ahead of stockouts with clear stock levels." },
];

function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              SF
            </span>
            <span className="truncate text-base font-bold">{BRAND.name}</span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                {isAuthenticated ? "Open workspace" : "Sign in"}
              </Link>
            </Button>
            <Button asChild>
              <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                {isAuthenticated ? "Dashboard" : "Get started"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <LineChart className="size-3.5 text-primary" /> Commerce OS for growing businesses
            </span>
            <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Run your business. <span className="text-gradient-brand">Sell with confidence.</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              SokoFlow brings your products, orders, customers and stock into one calm, fast
              workspace — built for how business really works across Africa.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                  {isAuthenticated ? "Go to dashboard" : "Create your workspace"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">I already have an account</Link>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => (
              <Card key={pillar.title} className="shadow-soft">
                <CardContent className="space-y-3 p-5">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <pillar.icon className="size-4" />
                  </span>
                  <h2 className="text-sm font-semibold">{pillar.title}</h2>
                  <p className="text-xs text-muted-foreground">{pillar.copy}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {BRAND.name}
          </p>
          <p>{BRAND.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
