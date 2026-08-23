import { describe, expect, test } from "vitest";
import en from "../../../../../messages/en.json";
import ja from "../../../../../messages/ja.json";
import { SUPPORT_EMAIL } from "@/lib/brand";

/*
  The contact page is the only route into the business from the marketing site,
  so the address itself is worth pinning: a typo here fails silently — the link
  still opens a mail client, the mail just never arrives.
*/
describe("contact details", () => {
  test("support address is the operating company's", () => {
    expect(SUPPORT_EMAIL).toBe("info@yabaistudios.com");
  });

  test("is a plausible address", () => {
    expect(SUPPORT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/);
  });

  test("is not translated", () => {
    // An address is not copy. Were it in the message files, a translator
    // editing it would quietly break the only way to reach support.
    const flat = JSON.stringify(en) + JSON.stringify(ja);
    expect(flat).not.toContain(SUPPORT_EMAIL);
  });

  test("both locales say to email, with a label for the address", () => {
    for (const messages of [en, ja]) {
      expect(messages.contact.body.length).toBeGreaterThan(0);
      expect(messages.contact.emailLabel.length).toBeGreaterThan(0);
    }
  });

  test("no longer claims contact details are still coming", () => {
    // The old copy read "A dedicated contact form and support details will
    // appear here soon", which contradicted an address printed underneath it.
    expect(en.contact).not.toHaveProperty("placeholderBody");
    expect(ja.contact).not.toHaveProperty("placeholderBody");
  });
});
