// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProfileSurface } from "@/components/dashboard/profile-surface";

/*
  Editing your profile used to replace the page with a stack of inputs, and
  every other "Edit profile" in the app was a link that navigated here first.
  Two steps and a lost place, to change one line of text.

  The form is a modal now: the profile stays on screen behind it, and a button
  anywhere can open it without going anywhere.
*/

const copy = {
  edit: "Edit profile",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  error: "Something went wrong",
  notSet: "Not set yet",
};

function renderSurface({
  onSave = vi.fn().mockResolvedValue(true),
  isEmpty = false,
  startInEdit = false,
  presentation,
}: {
  onSave?: (e: React.FormEvent) => Promise<boolean>;
  isEmpty?: boolean;
  startInEdit?: boolean;
  presentation?: "page" | "trigger";
} = {}) {
  render(
    <ProfileSurface
      presentation={presentation}
      avatarUrl={null}
      name="The Nagano Adventure"
      avatarHelp="Your photo comes from Google."
      isEmpty={isEmpty}
      startInEdit={startInEdit}
      saveState="idle"
      copy={copy}
      entries={[{ label: "Short introduction", value: "Hello", empty: false }]}
      onSave={onSave}
    >
      <label htmlFor="bio">Short introduction</label>
      <input id="bio" defaultValue="Hello" />
    </ProfileSurface>,
  );
  return { onSave };
}

const dialog = () => screen.queryByRole("dialog");
const openEditor = () => fireEvent.click(screen.getByRole("button", { name: copy.edit }));

describe("ProfileSurface", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  test("shows the profile, with no form in the way", () => {
    renderSurface();

    expect(screen.getByText("The Nagano Adventure")).toBeInTheDocument();
    expect(dialog()).toBeNull();
  });

  test("Edit opens the form in a dialog", () => {
    renderSurface();

    openEditor();

    expect(dialog()).toBeInTheDocument();
    expect(screen.getByLabelText("Short introduction")).toBeInTheDocument();
  });

  test("the profile stays on screen behind it", () => {
    // The point of a modal over a page swap: you can still see what you are
    // editing, and closing it puts you back where you were.
    renderSurface();

    openEditor();

    expect(screen.getByText("The Nagano Adventure")).toBeInTheDocument();
  });

  test("Cancel closes it", () => {
    renderSurface();
    openEditor();

    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));

    expect(dialog()).toBeNull();
  });

  test("clicking outside closes it", () => {
    // The dialog element itself is the backdrop; its inner wrapper stops
    // propagation for clicks on the actual content.
    renderSurface();
    openEditor();

    fireEvent.click(dialog()!);

    expect(dialog()).toBeNull();
  });

  test("clicking the form inside does not close it", () => {
    renderSurface();
    openEditor();

    fireEvent.click(screen.getByLabelText("Short introduction"));

    expect(dialog()).toBeInTheDocument();
  });

  test("a save that worked closes it", async () => {
    const { onSave } = renderSurface({ onSave: vi.fn().mockResolvedValue(true) });
    openEditor();

    fireEvent.click(screen.getByRole("button", { name: copy.save }));

    await waitFor(() => expect(dialog()).toBeNull());
    expect(onSave).toHaveBeenCalled();
  });

  test("a save that failed leaves it open, with the typing intact", async () => {
    // Closing on failure would discard what they wrote and show them the old
    // profile, with nothing to say the change did not land.
    renderSurface({ onSave: vi.fn().mockResolvedValue(false) });
    openEditor();
    fireEvent.change(screen.getByLabelText("Short introduction"), {
      target: { value: "Rewritten" },
    });

    fireEvent.click(screen.getByRole("button", { name: copy.save }));

    await waitFor(() => expect(dialog()).toBeInTheDocument());
    expect(screen.getByLabelText("Short introduction")).toHaveValue("Rewritten");
  });

  test("a profile with nothing in it opens the form straight away", () => {
    // There is nothing to look at yet, so waiting for a click would be a blank
    // page with a button on it.
    renderSurface({ isEmpty: true });

    expect(dialog()).toBeInTheDocument();
  });

  test("arriving mid-onboarding opens it too", () => {
    renderSurface({ startInEdit: true });

    expect(dialog()).toBeInTheDocument();
  });

  describe("as a trigger, for the buttons that used to be links", () => {
    /*
      "Edit profile" also appears on the dashboard card and in the schedule
      header. Those were links here, so changing one line meant a page load, a
      second click, and losing your place. They render this same surface in
      trigger form: the button and its dialog, without a second copy of the
      profile underneath.
    */
    test("offers the button without repeating the profile", () => {
      renderSurface({ presentation: "trigger" });

      expect(screen.getByRole("button", { name: copy.edit })).toBeInTheDocument();
      expect(screen.queryByText("Short introduction")).toBeNull();
    });

    test("opens the same form", () => {
      renderSurface({ presentation: "trigger" });

      openEditor();

      expect(dialog()).toBeInTheDocument();
      expect(screen.getByLabelText("Short introduction")).toBeInTheDocument();
    });

    test("an empty profile does not ambush you with a dialog here", () => {
      // Opening straight into the form makes sense on the profile page, where
      // there is nothing else to look at. On a dashboard it would be a modal
      // thrown over the page you asked for.
      renderSurface({ presentation: "trigger", isEmpty: true });

      expect(dialog()).toBeNull();
    });
  });
});
