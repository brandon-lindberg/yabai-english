import { describe, test } from "vitest";

describe("booking policy", () => {
  test.todo("returns refund=true when student cancels at least 48h before lesson");
  test.todo("returns refund=false and reschedule=true when student cancels under 48h");
  test.todo("returns refund+free lesson when teacher cancels under 24h");
});
