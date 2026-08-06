import type { ReactNode } from "react";
import { Outcome } from "@/components/ui/outcome";

/**
 * An empty list is one kind of outcome, so it renders as one. This name is kept
 * because "nothing here yet" is a narrower, clearer thing to reach for at a
 * call site than the general panel — but there is only one implementation.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string | null;
  action?: ReactNode;
}) {
  return <Outcome title={title} description={description} actions={action} />;
}
