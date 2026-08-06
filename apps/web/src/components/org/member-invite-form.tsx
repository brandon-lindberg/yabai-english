"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Section } from "@/components/ui/section";
import { Status } from "@/components/ui/status";

/**
 * Inviting someone to an org or a school.
 *
 * Both member lists had their own copy of this form, each with the same pair of
 * hand-written `inputCn` / `selectCn` class strings. The org version asks which
 * school; the school version already knows. That is the only real difference,
 * so it is a prop.
 *
 * The role options were hard-coded English (`School Admin`, `Teacher`,
 * `Student`) in both — they now come from the caller, which has the translator.
 */

export type InviteRoleOption = { value: string; label: string };

export function MemberInviteForm({
  roles,
  schools,
  copy,
  onInvite,
  onCancel,
}: {
  roles: InviteRoleOption[];
  /** Omit when the school is already implied by where the form is shown. */
  schools?: Array<{ id: string; name: string }>;
  copy: {
    title: string;
    email: string;
    emailPlaceholder?: string;
    role: string;
    school?: string;
    selectSchool?: string;
    send: string;
    sending: string;
    cancel: string;
    error: string;
  };
  /** Resolves false when the invite was rejected. */
  onInvite: (input: { email: string; role: string; schoolId: string }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]?.value ?? "");
  const [schoolId, setSchoolId] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFailed(false);
    const ok = await onInvite({ email, role, schoolId });
    if (ok) {
      setEmail("");
    } else {
      setFailed(true);
    }
    setSaving(false);
  }

  return (
    <Section title={copy.title} size="sm" className="mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={copy.email} required>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
              required
            />
          )}
        </Field>

        <div className={schools ? "grid gap-4 sm:grid-cols-2" : ""}>
          <Field label={copy.role}>
            {(control) => (
              <Select {...control} value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {schools ? (
            <Field label={copy.school ?? ""} required>
              {(control) => (
                <Select
                  {...control}
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  required
                >
                  <option value="">{copy.selectSchool}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
        </div>

        {failed ? (
          <p role="alert">
            <Status tone="error">{copy.error}</Status>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving}>
            {saving ? copy.sending : copy.send}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {copy.cancel}
          </Button>
        </div>
      </form>
    </Section>
  );
}
