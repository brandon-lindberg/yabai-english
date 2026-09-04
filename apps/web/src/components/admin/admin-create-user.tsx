"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
 */
export function AdminCreateUser() {
  const t = useTranslations("admin.createUser");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("TEACHER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
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
      setOpen(false);
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
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t("open")}
      </Button>

      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={t("title")}
          description={t("subtitle")}
          actions={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                {t("cancel")}
              </Button>
              <Button onClick={() => void submit()} disabled={!email.trim()} loading={busy}>
                {busy ? t("working") : t("submit")}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
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
          </div>
        </Modal>
      ) : null}
    </>
  );
}
