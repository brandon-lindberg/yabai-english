"use client";

import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormStatus, type SaveState } from "@/components/ui/form-status";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Modal } from "@/components/ui/modal";

/**
 * Your own profile — shown as a profile, edited on request.
 *
 * Both profile screens used to open straight into a stack of inputs, so the
 * first thing you saw of "your profile" was empty boxes, and the less you had
 * filled in the more of the page they took. The teacher screen was rewritten to
 * lead with the profile; the student screen was not, and the two promptly
 * diverged into different answers to the same question.
 *
 * The chrome lives here: the portrait header, the view/edit switch, the draft
 * that Cancel discards, and the save state. What differs between a teacher and
 * a student is which fields exist — so those are the `entries` (reading) and
 * the `children` (editing).
 *
 * Editing happens in a dialog over the profile rather than in place of it. It
 * used to replace the page, which meant every other "Edit profile" in the app
 * had to be a link that brought you here first: two steps and a lost place to
 * change one line. A dialog keeps the profile visible behind it, and lets a
 * button anywhere open the same form without going anywhere.
 */

export type ProfileEntry = {
  label: string;
  /** Rendered as-is; pass a preview component for rich text. */
  value: ReactNode;
  /** True when nothing has been entered, so it reads as muted. */
  empty?: boolean;
};

export function ProfileSurface({
  avatarUrl,
  name,
  subtitle,
  headerStatus,
  entries,
  footer,
  avatarHelp,
  emptyHint,
  isEmpty,
  startInEdit = false,
  presentation = "page",
  saveState,
  copy,
  onSave,
  onStartEdit,
  onCancelEdit,
  children,
}: {
  avatarUrl: string | null;
  name: string;
  subtitle?: string | null;
  /** e.g. whether the profile is listed publicly. */
  headerStatus?: ReactNode;
  entries: ProfileEntry[];
  /** View-mode extras, e.g. a link to the public page. */
  footer?: ReactNode;
  avatarHelp: string;
  /** Shown while editing a profile that has nothing in it yet. */
  emptyHint?: string;
  isEmpty: boolean;
  /** Onboarding arrives mid-flow and should land straight in the form. */
  startInEdit?: boolean;
  /**
   * `page` is the profile screen: the profile, with the editor over it.
   * `trigger` is everywhere else the app offers "Edit profile" — the dashboard
   * card, the schedule header — where the same editor is wanted but a second
   * copy of the profile underneath it is not.
   */
  presentation?: "page" | "trigger";
  saveState: SaveState;
  copy: {
    edit: string;
    cancel: string;
    save: string;
    saving: string;
    saved: string;
    error: string;
    notSet: string;
  };
  /** Resolve `true` when the save succeeded, to return to the profile. */
  onSave: (e: React.FormEvent) => Promise<boolean>;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  children: ReactNode;
}) {
  /*
    Nothing written yet means nothing to look at, so a new user — and anyone
    arriving mid-onboarding — lands in edit mode rather than on an empty page.
  */
  const [editing, setEditing] = useState(
    // Only where the profile is the page. As a trigger on somebody's dashboard,
    // opening unasked would throw a dialog over what they came to look at.
    presentation === "page" && (isEmpty || startInEdit),
  );

  const status = (
    <FormStatus
      state={saveState}
      savingLabel={copy.saving}
      savedLabel={copy.saved}
      errorLabel={copy.error}
    />
  );

  const editDialog = (
    <Modal
      open
      /*
        Closing without saving discards the draft, whichever way you leave:
        Cancel, Escape, or a click outside. One exit, one meaning.
      */
      onClose={() => {
        onCancelEdit?.();
        setEditing(false);
      }}
      title={copy.edit}
      size="lg"
    >
      <form
        onSubmit={(e) => {
          void onSave(e).then((saved) => {
            if (saved) setEditing(false);
          });
        }}
        className="space-y-6"
      >
        <div className="flex items-start gap-4">
          <Avatar src={avatarUrl} name={name} size="lg" />
          <p className="text-sm text-muted">{avatarHelp}</p>
        </div>

        {isEmpty && emptyHint ? <InlineAlert>{emptyHint}</InlineAlert> : null}
        {footer}

        {children}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {status}
          {/* Nothing to go back to when the profile is empty, so no Cancel. */}
          {isEmpty ? null : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onCancelEdit?.();
                setEditing(false);
              }}
            >
              {copy.cancel}
            </Button>
          )}
          <Button type="submit" loading={saveState === "saving"}>
            {copy.save}
          </Button>
        </div>
      </form>
    </Modal>
  );

  if (presentation === "trigger") {
    return (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            onStartEdit?.();
            setEditing(true);
          }}
        >
          {copy.edit}
        </Button>
        {editing ? editDialog : null}
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar src={avatarUrl} name={name} size="lg" />
            <div className="min-w-0">
              <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-black leading-[1.05] tracking-[-0.03em] text-foreground">
                {name || copy.notSet}
              </h2>
              {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
              {headerStatus ? <p className="mt-3">{headerStatus}</p> : null}
            </div>
          </div>
          <Button
            onClick={() => {
              onStartEdit?.();
              setEditing(true);
            }}
          >
            {copy.edit}
          </Button>
        </div>

        {status}

        <dl className="border-t border-border">
          {entries.map((entry) => (
            <div key={entry.label} className="border-b border-border py-4">
              <dt className="text-sm text-muted">{entry.label}</dt>
              <dd
                className={`mt-1 max-w-[68ch] leading-relaxed ${
                  entry.empty ? "text-muted" : "text-foreground"
                }`}
              >
                {entry.empty ? copy.notSet : entry.value}
              </dd>
            </div>
          ))}
        </dl>

        {footer}
        <p className="text-sm text-muted">{avatarHelp}</p>
      </div>

      {editing ? editDialog : null}
    </>
  );
}
