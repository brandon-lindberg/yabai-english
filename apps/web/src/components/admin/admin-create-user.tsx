"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Status } from "@/components/ui/status";
import { InlineAlert } from "@/components/ui/inline-alert";

/**
 * Create an account for someone who has not signed up yet, with their role
 * already set.
 *
 * Teaching here is by invitation, and until now that meant waiting for the
 * person to sign up as a student so an admin could change the column
 * afterwards — they met a student dashboard first, and somebody had to remember
 * to go back and fix it.
 *
 * The row alone is enough because the Google provider links an OAuth account to
 * an existing user with the same address, and the sign-in callback looks that
 * user up by email and leaves a teacher's role alone. So the invitee signs in
 * with Google as usual and arrives as a teacher.
 *
 * No administrator option: promoting an existing, known account is a deliberate
 * act against a record that already exists. Typing an address into a box is not
 * the same thing, and the endpoint refuses it either way.
 *
 * A page rather than a dialog. It was a button in the corner of the All users
 * tab — a page about listing people, not about adding them — so an admin
 * looking for it had no reason to go there.
 */
export function AdminCreateUser() {
  const t = useTranslations("admin.createUser");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("TEACHER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The last address created, so the admin can see it landed. */
  const [created, setCreated] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        // The server's reason where it gave one: "already exists" is the
        // common case and is worth saying exactly.
        setError(data?.error ?? t("error"));
        return;
      }
      setCreated(email.trim().toLowerCase());
      setEmail("");
      setName("");
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}

      <Field label={t("email")}>
        {(field) => (
          <Input
            {...field}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <Field label={t("name")}>
        {(field) => (
          <Input {...field} value={name} onChange={(e) => setName(e.target.value)} />
        )}
      </Field>

      <Field label={t("role")}>
        {(field) => (
          <Select {...field} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="TEACHER">{t("roleTeacher")}</option>
            <option value="STUDENT">{t("roleStudent")}</option>
          </Select>
        )}
      </Field>

      {/* Nothing is emailed. Saying so here stops an admin assuming the
          invitee has been told anything at all. */}
      <InlineAlert>{t("hint")}</InlineAlert>

      <div className="flex items-center gap-3">
        <Button onClick={() => void submit()} disabled={!email.trim()} loading={busy}>
          {busy ? t("working") : t("submit")}
        </Button>
        {created ? <Status tone="settled">{t("created", { email: created })}</Status> : null}
      </div>
    </div>
  );
}
