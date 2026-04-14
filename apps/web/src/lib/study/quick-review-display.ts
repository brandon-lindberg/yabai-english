const BLANK_TOKEN = "___";

export function extractQuickReviewBlankAnswer(frontText: string, backText: string): string | null {
  const blankIdx = frontText.indexOf(BLANK_TOKEN);
  if (blankIdx < 0) return null;
  if (frontText.indexOf(BLANK_TOKEN, blankIdx + BLANK_TOKEN.length) >= 0) return null;

  const prefix = frontText.slice(0, blankIdx);
  const suffix = frontText.slice(blankIdx + BLANK_TOKEN.length);

  if (!backText.startsWith(prefix)) return null;
  if (!backText.endsWith(suffix)) return null;

  const start = prefix.length;
  const end = backText.length - suffix.length;
  if (end <= start) return null;

  const answer = backText.slice(start, end).trim();
  return answer.length > 0 ? answer : null;
}

/**
 * Removes leading instruction labels for cloze prompts so legacy cards don't leak answers.
 * Example: `Use "seems": He ___ ...` -> `He ___ ...`
 */
export function resolveQuickReviewFrontText(frontText: string): string {
  if (!frontText.includes(BLANK_TOKEN)) return frontText;
  const colonIdx = frontText.indexOf(":");
  if (colonIdx < 0) return frontText;
  const after = frontText.slice(colonIdx + 1).trim();
  if (!after.includes(BLANK_TOKEN)) return frontText;
  return after;
}

/**
 * For cloze-style quick-review prompts, show only the missing answer to reduce noise.
 */
export function resolveQuickReviewBackText(frontText: string, backText: string): string {
  return extractQuickReviewBlankAnswer(frontText, backText) ?? backText;
}
