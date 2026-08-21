// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field, Input } from "../field";

describe("Field", () => {
  test("labels a normal control by pointing a <label> at it", () => {
    render(
      <Field label="Display name">
        {(control) => <Input {...control} defaultValue="" />}
      </Field>,
    );

    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
  });

  test("the control bag is safe to spread straight onto a DOM element", () => {
    // Every Field call site in the app does `{...control}`. Anything in that
    // bag that is not a real DOM attribute lands on the element, so group-mode
    // extras must travel separately. Asserted on the DOM rather than on a
    // console spy, because React only warns once per prop name per session.
    render(
      <Field label="Display name">
        {(control) => <Input {...control} defaultValue="" />}
      </Field>,
    );

    const input = screen.getByLabelText("Display name");
    expect(input.getAttributeNames()).not.toContain("labelid");
    expect(input.getAttributeNames().filter((n) => !n.startsWith("aria-"))).toEqual(
      expect.arrayContaining(["id"]),
    );
  });

  test("wires the hint into aria-describedby", () => {
    render(
      <Field label="Bio" hint="Keep it short">
        {(control) => <Input {...control} defaultValue="" />}
      </Field>,
    );

    const input = screen.getByLabelText("Bio");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe("Keep it short");
  });
});

describe("Field in group mode", () => {
  /*
    A rich-text editor's contenteditable is not a labelable element, so
    `<label for>` does not attach to it. Both markdown call sites hand-rolled a
    <span id> + role="group" + aria-labelledby instead, which is how the app
    ended up with three separate implementations of field labelling.
  */
  test("names a non-labelable control through role=group", () => {
    render(
      <Field label="Lesson notes" as="group">
        {(control, group) => (
          <div role="group" aria-labelledby={group.labelId} aria-describedby={control["aria-describedby"]}>
            <div contentEditable />
          </div>
        )}
      </Field>,
    );

    expect(screen.getByRole("group", { name: "Lesson notes" })).toBeInTheDocument();
  });

  test("still exposes hint text to the group", () => {
    render(
      <Field label="Bio" hint="Markdown supported" as="group">
        {(control, group) => (
          <div role="group" aria-labelledby={group.labelId} aria-describedby={control["aria-describedby"]}>
            <div contentEditable />
          </div>
        )}
      </Field>,
    );

    const group = screen.getByRole("group", { name: "Bio" });
    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe("Markdown supported");
  });

  test("does not emit a <label for> that points at nothing", () => {
    // A dangling htmlFor is worse than none: it claims an association the
    // assistive tech then cannot resolve.
    const { container } = render(
      <Field label="Notes" as="group">
        {(control, group) => <div role="group" aria-labelledby={group.labelId} />}
      </Field>,
    );

    expect(container.querySelector("label")).toBeNull();
  });

  test("keeps showing the required marker outside the label text", () => {
    render(
      <Field label="Notes" as="group" required>
        {(control, group) => <div role="group" aria-labelledby={group.labelId} />}
      </Field>,
    );

    expect(screen.getByRole("group", { name: "Notes" })).toBeInTheDocument();
  });

  test("errors reach the group and replace the hint", () => {
    render(
      <Field label="Notes" as="group" hint="Markdown supported" error="Too long">
        {(control, group) => (
          <div role="group" aria-labelledby={group.labelId} aria-describedby={control["aria-describedby"]} />
        )}
      </Field>,
    );

    const group = screen.getByRole("group", { name: "Notes" });
    const describedBy = group.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)?.textContent).toBe("Too long");
    expect(screen.queryByText("Markdown supported")).toBeNull();
  });
});
