"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MarkdownField } from "@/components/ui/markdown-field";
import { ENTITY_DESCRIPTION_MAX_CHARS } from "@/lib/markdown/limits";
import { FormStatus, type SaveState } from "@/components/ui/form-status";
import { Section } from "@/components/ui/section";

/**
 * The name-and-description settings form, once.
 *
 * The organization form and the school form were the same component with a
 * different endpoint: same load-into-state, same PATCH, same save-state
 * machine, same submit button, and the same `inputCn` string pasted verbatim
 * into both. Only the endpoint, the response key and the field list differed —
 * so those are the props.
 *
 * Fields are declared as rows so a pair can share a line, which is what the
 * `sm:grid-cols-2` block in both originals was doing by hand.
 */

export type SettingsField = {
  /** Key on the entity, and the key sent in the PATCH body. */
  name: string;
  label: string;
  multiline?: boolean;
  required?: boolean;
};

export function EntitySettingsForm({
  endpoint,
  responseKey,
  rows,
  copy,
  children,
}: {
  /** Used for both the GET and the PATCH. */
  endpoint: string;
  /** Key the GET response nests the entity under, e.g. `organization`. */
  responseKey: string;
  rows: SettingsField[][];
  copy: { save: string; saving: string; saved: string; error: string };
  /** Extra controls rendered above the save button. */
  children?: ReactNode;
}) {
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState<SaveState>("idle");

  useEffect(() => {
    let cancelled = false;
    void fetch(endpoint)
      .then((r) => r.json())
      .then((d: Record<string, Record<string, string>>) => {
        if (!cancelled) setData(d[responseKey] ?? null);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, responseKey]);

  if (!data) return null;

  const fields = rows.flat();

  function update(name: string, value: string) {
    setData((prev) => (prev ? { ...prev, [name]: value } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    /*
      Only the declared fields are sent. The school form used to PATCH back the
      entire object it had been given by the GET — id, slug, timestamps and all —
      which is a lot of trust to place in the endpoint's validation.
    */
    const body: Record<string, string | undefined> = {};
    for (const field of fields) {
      const value = data?.[field.name] ?? "";
      body[field.name] = field.required ? value : value || undefined;
    }

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setStatus(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Section ruled={false}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {rows.map((row, index) => (
          <div
            key={row.map((f) => f.name).join("-") || index}
            className={row.length > 1 ? "grid gap-4 sm:grid-cols-2" : ""}
          >
            {row.map((field) =>
              /* Multiline here always means prose — a description — so it is
                 authored as markdown like every other prose field. */
              field.multiline ? (
                <MarkdownField
                  key={field.name}
                  label={field.label}
                  required={field.required}
                  value={data?.[field.name] ?? ""}
                  maxChars={ENTITY_DESCRIPTION_MAX_CHARS}
                  onChange={(md) => update(field.name, md)}
                />
              ) : (
                <Field key={field.name} label={field.label} required={field.required}>
                  {(control) => (
                    <Input
                      {...control}
                      value={data?.[field.name] ?? ""}
                      onChange={(e) => update(field.name, e.target.value)}
                      required={field.required}
                    />
                  )}
                </Field>
              ),
            )}
          </div>
        ))}

        {children}

        <FormStatus
          state={status}
          savingLabel={copy.saving}
          savedLabel={copy.saved}
          errorLabel={copy.error}
        />

        <Button type="submit" loading={status === "saving"}>
          {copy.save}
        </Button>
      </form>
    </Section>
  );
}
