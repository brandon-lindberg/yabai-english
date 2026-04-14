"use client";

import { useState } from "react";

type Props = {
  initialDisplayName: string | null;
  initialBio: string | null;
  initialCountryOfOrigin: string | null;
  initialCredentials: string | null;
  initialInstructionLanguages: string[];
  initialSpecialties: string[];
};

export function TeacherProfileForm({
  initialDisplayName,
  initialBio,
  initialCountryOfOrigin,
  initialCredentials,
  initialInstructionLanguages,
  initialSpecialties,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialCountryOfOrigin ?? "");
  const [credentials, setCredentials] = useState(initialCredentials ?? "");
  const [instructionLanguages, setInstructionLanguages] = useState(initialInstructionLanguages.join(", "));
  const [specialties, setSpecialties] = useState(initialSpecialties.join(", "));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const response = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() === "" ? null : bio.trim(),
        countryOfOrigin: countryOfOrigin.trim() === "" ? null : countryOfOrigin.trim(),
        credentials: credentials.trim() === "" ? null : credentials.trim(),
        instructionLanguages: instructionLanguages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        specialties: specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={100}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Country of origin</span>
          <input
            value={countryOfOrigin}
            onChange={(e) => setCountryOfOrigin(e.target.value)}
            maxLength={80}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-foreground">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={2000}
          rows={5}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-foreground">Credentials</span>
        <textarea
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
          maxLength={2000}
          rows={4}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Instruction languages (comma separated)</span>
          <input
            value={instructionLanguages}
            onChange={(e) => setInstructionLanguages(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Specialties (comma separated)</span>
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Save profile"}
        </button>
        {status === "saved" ? <span className="text-sm text-green-600 dark:text-green-400">Saved</span> : null}
        {status === "error" ? <span className="text-sm text-destructive">Could not save</span> : null}
      </div>
    </form>
  );
}
