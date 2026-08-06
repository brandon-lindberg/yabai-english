"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-row";
import { Status } from "@/components/ui/status";
import { MemberRow } from "@/components/org/member-row";
import { MemberInviteForm } from "@/components/org/member-invite-form";
import { ORG_INVITE_ROLES } from "@/lib/org/invite-roles";

type Member = {
  id: string;
  orgRole: string;
  status: string;
  schoolId: string | null;
  school?: { name: string } | null;
  user: { id: string; name: string | null; email: string | null; image: string | null };
};

type School = { id: string; name: string };

export function OrgMembersList({ orgId }: { orgId: string }) {
  const t = useTranslations("org.membersPage");
  const tr = useTranslations("org.roles");
  const ts = useTranslations("org.memberStatus");
  const [members, setMembers] = useState<Member[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    void fetch(`/api/org/${orgId}/members`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
    void fetch(`/api/org/${orgId}/schools`)
      .then((r) => r.json())
      .then((d) => setSchools(d.schools ?? []));
  }, [orgId]);

  async function handleInvite(input: { email: string; role: string; schoolId: string }) {
    const res = await fetch(`/api/org/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, orgRole: input.role, schoolId: input.schoolId }),
    });
    if (!res.ok) return false;

    const { membership } = await res.json();
    setMembers((prev) => [membership, ...prev]);
    setShowInvite(false);
    setFeedback(t("inviteSent"));
    setTimeout(() => setFeedback(""), 3000);
    return true;
  }

  async function handleRemove(memberId: string) {
    if (!confirm(t("removeConfirm"))) return;
    const res = await fetch(`/api/org/${orgId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      setFeedback(t("removeError"));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {feedback ? (
          <p role="status">
            <Status tone="settled">{feedback}</Status>
          </p>
        ) : (
          <span />
        )}
        <Button onClick={() => setShowInvite(!showInvite)}>{t("invite")}</Button>
      </div>

      {showInvite ? (
        <MemberInviteForm
          roles={ORG_INVITE_ROLES.map((role) => ({ value: role, label: tr(role) }))}
          schools={schools}
          copy={{
            title: t("inviteTitle"),
            email: t("inviteEmail"),
            emailPlaceholder: t("inviteEmailPlaceholder"),
            role: t("inviteRole"),
            school: t("inviteSchool"),
            selectSchool: t("inviteSelectSchool"),
            send: t("send"),
            sending: t("sending"),
            cancel: t("cancel"),
            error: t("inviteError"),
          }}
          onInvite={handleInvite}
          onCancel={() => setShowInvite(false)}
        />
      ) : null}

      {members.length === 0 ? (
        <p className="border-y border-border py-6 text-sm text-muted">{t("noMembers")}</p>
      ) : (
        <DataList>
          {members.map((m) => (
            <MemberRow
              key={m.id}
              name={m.user.name ?? m.user.email ?? ""}
              email={m.user.email}
              imageUrl={m.user.image}
              role={tr(m.orgRole as never)}
              status={m.status}
              statusLabel={ts(m.status as never)}
              meta={m.schoolId ? m.school?.name : t("orgWide")}
              actions={
                m.orgRole !== "OWNER" ? (
                  <Button variant="destructive" size="sm" onClick={() => handleRemove(m.id)}>
                    {t("remove")}
                  </Button>
                ) : null
              }
            />
          ))}
        </DataList>
      )}
    </div>
  );
}
