import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchBar } from "@/components/common/search-bar";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ModulePageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  createLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  searchPlaceholder: string;
  children?: ReactNode;
};

export function ModulePage({
  title,
  description,
  icon,
  createLabel,
  emptyTitle,
  emptyDescription,
  searchPlaceholder,
  children,
}: ModulePageProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: "SokoFlow", to: "/dashboard" }, { label: title }]}
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> {createLabel}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{createLabel}</DialogTitle>
                <DialogDescription>
                  This module is ready for its first feature. The form fields land in the next build.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button disabled>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="space-y-5 p-5">
          <SectionHeader title={title} description={`All ${title.toLowerCase()} in this workspace.`} />
          <SearchBar placeholder={searchPlaceholder} />
          {children ?? (
            <EmptyState
              icon={icon}
              title={emptyTitle}
              description={emptyDescription}
              action={
                <Button variant="outline" size="sm">
                  <Plus className="size-4" /> {createLabel}
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
