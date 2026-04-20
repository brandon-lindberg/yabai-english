"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppCard } from "@/components/ui/app-card";

type Member = {
  id: string;
  orgRole: string;
  status: string;
  schoolId: string | null;
  school?: { name: string } | null;
  user: { id: string; name: string | null; email: string | null; image: string | null };
};

type School = { id: string; name: string };

type Props = { orgId: string };

export function OrgMembersList({ orgId }: Props) {
  const t = useTranslations("org.membersPage");
  const [members, setMembers] = useState<Member[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TEACHER");
  const [schoolId, setSchoolId] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetch(`/api/org/${orgId}/members`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
    fetch(`/api/org/${orgId}/schools`)
      .then((r) => r.json())
      .then((d) => setSchools(d.schools ?? []));
  }, [orgId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");

    const res = await fetch(`/api/org/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orgRole: role, schoolId }),
    });

    if (!res.ok) {
      setFeedback(t("inviteError"));
      setSaving(false);
      return;
    }

    const { membership } = await res.json();
    setMembers((prev) => [membership, ...prev]);
    setShowInvite(false);
    setEmail("");
    setSaving(false);
    setFeedback(t("inviteSent"));
    setTimeout(() => setFeedback(""), 3000);
  }

  async function handleRemove(memberId: string) {
    if (!confirm(t("removeConfirm"))) return;
    const res = await fetch(`/api/org/${orgId}/members/${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      setFeedback(t("removeError"));
    }
  }

  const inputCn =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";
  const selectCn =
    "rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        {feedback && (
          <p className="text-sm text-muted">{feedback}</p>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("invite")}
          </button>
        </div>
      </div>

      {showInvite && (
        <AppCard className="mb-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t("inviteTitle")}
          </h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {t("inviteEmail")}
              </label>
              <input
                type="email"
                className={inputCn}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("inviteEmailPlaceholder")}
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("inviteRole")}
                </label>
                <select className={selectCn} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="SCHOOL_ADMIN">School Admin</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t("inviteSchool")}
                </label>
                <select
                  className={selectCn}
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  required
                >
                  <option value="">{t("inviteSelectSchool")}</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? t("sending") : t("send")}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </AppCard>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-muted">{t("noMembers")}</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                {m.user.image ? (
                  <img
                    src={m.user.image}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-hover)] text-xs font-medium text-muted">
                    {(m.user.name ?? m.user.email ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">
                    {m.user.name ?? m.user.email}
                  </p>
                  <p className="text-xs text-muted">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-[var(--app-hover)] px-2 py-0.5 text-xs font-medium text-foreground">
                  {m.orgRole}
                </span>
                <span className="text-xs text-muted">
                  {m.schoolId ? (m as { school?: { name: string } }).school?.name : t("orgWide")}
                </span>
                <span className="text-xs text-muted">{m.status}</span>
                {m.orgRole !== "OWNER" && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-xs text-[var(--app-danger)] hover:underline"
                  >
                    {t("remove")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
