"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-row";
import { MemberRow } from "@/components/org/member-row";
import { MemberInviteForm } from "@/components/org/member-invite-form";
import { SCHOOL_INVITE_ROLES } from "@/lib/org/invite-roles";
import { groupMembershipsByPerson } from "@/lib/org/member-identity";

type Member = {
  id: string;
  orgRole: string;
  status: string;
  userId: string | null;
  inviteEmail: string | null;
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
};

export function SchoolMembersView({ orgId, schoolId }: { orgId: string; schoolId: string }) {
  const t = useTranslations("org.school.membersPage");
  const tr = useTranslations("org.roles");
  const ts = useTranslations("org.memberStatus");
  const [members, setMembers] = useState<Member[]>([]);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    void fetch(`/api/org/${orgId}/members?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
  }, [orgId, schoolId]);

  async function handleInvite(input: { email: string; role: string }) {
    const res = await fetch(`/api/org/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, orgRole: input.role, schoolId }),
    });
    if (!res.ok) return false;

    const { membership } = await res.json();
    setMembers((prev) => [membership, ...prev]);
    setShowInvite(false);
    return true;
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowInvite(!showInvite)}>{t("invite")}</Button>
      </div>

      {showInvite ? (
        /* No school picker: this form only ever invites into the school whose
           page it is shown on. That is the one thing that differs from the
           org-level invite. */
        <MemberInviteForm
          roles={SCHOOL_INVITE_ROLES.map((role) => ({ value: role, label: tr(role) }))}
          copy={{
            title: t("inviteTitle"),
            email: t("inviteEmail"),
            emailPlaceholder: t("inviteEmailPlaceholder"),
            role: t("inviteRole"),
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
          {groupMembershipsByPerson(members).map(({ key, memberships }) => {
            const first = memberships[0]!;
            return (
            <MemberRow
              key={key}
              name={first.user?.name ?? first.user?.email ?? first.inviteEmail ?? ""}
              email={first.user?.email ?? first.inviteEmail ?? ""}
              imageUrl={first.user?.image}
              grants={memberships.map((m) => ({
                id: m.id,
                role: tr(m.orgRole as never),
                status: m.status,
                statusLabel: ts(m.status as never),
              }))}
            />
            );
          })}
        </DataList>
      )}
    </div>
  );
}
