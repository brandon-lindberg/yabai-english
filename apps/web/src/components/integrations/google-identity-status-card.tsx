type Props = {
  email: string | null | undefined;
  name: string | null | undefined;
};

export function GoogleIdentityStatusCard({ email, name }: Props) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Google identity</h2>
      <p className="mt-2 text-sm text-muted">
        Signed in as {name || email || "Google user"}.
      </p>
      <p className="mt-1 text-xs text-muted">
        Base sign-in uses identity scopes only (`openid`, `email`, `profile`).
      </p>
    </article>
  );
}
