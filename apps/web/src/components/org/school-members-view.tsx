"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type Member = {
  id: string;
  orgRole: string;
  status: string;
  inviteEmail?: string | null;
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
};

type Props = { orgId: string; schoolId: string };

export function SchoolMembersView({ orgId, schoolId }: Props) {
  const t = useTranslations("org.school.membersPage");
  const [members, setMembers] = useState<Member[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/org/${orgId}/members?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
  }, [orgId, schoolId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/org/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orgRole: role, schoolId }),
    });

    if (res.ok) {
      const { membership } = await res.json();
      setMembers((prev) => [membership, ...prev]);
      setShowInvite(false);
      setEmail("");
    }
    setSaving(false);
  }

  const visible = members;

  const inputCn =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";
  const selectCn =
    "rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("invite")}
        </button>
      </div>

      {showInvite && (
        <AppCard className="mb-6">
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <input
                type="email"
                className={inputCn}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com"
                required
              />
            </div>
            <select className={selectCn} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="SCHOOL_ADMIN">School Admin</option>
              <option value="TEACHER">Teacher</option>
              <option value="STUDENT">Student</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {t("invite")}
            </button>
          </form>
        </AppCard>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-muted">{t("noMembers")}</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {visible.map((m) => {
            const displayName = m.user?.name ?? m.user?.email ?? m.inviteEmail ?? "";
            const displayEmail = m.user?.email ?? m.inviteEmail ?? "";
            return (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  {m.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.user.image} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-hover)] text-xs font-medium text-muted">
                      {(displayName || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted">{displayEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--app-hover)] px-2 py-0.5 text-xs font-medium">
                    {m.orgRole}
                  </span>
                  <span className="text-xs text-muted">{m.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
