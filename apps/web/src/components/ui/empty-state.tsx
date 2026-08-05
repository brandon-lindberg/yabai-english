import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string | null;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="border-t border-border py-10 text-center">
      <p className="text-base font-bold tracking-[-0.02em] text-foreground">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
