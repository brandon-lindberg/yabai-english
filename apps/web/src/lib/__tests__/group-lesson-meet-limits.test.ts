import { describe, expect, test } from "vitest";
import {
  GOOGLE_MEET_FREE_GROUP_CALL_MINUTES,
  GOOGLE_MEET_MAX_PARTICIPANTS,
  groupClassParticipants,
  groupMeetAdvisory,
} from "@/lib/group-lesson-meet-limits";

describe("groupClassParticipants", () => {
  test("counts the teacher in the room", () => {
    expect(groupClassParticipants(4)).toBe(5);
  });
});

describe("groupMeetAdvisory", () => {
  test("says nothing about a private lesson of any length", () => {
    // One-to-one calls run for 24 hours, so a 90 minute private lesson is fine.
    expect(groupMeetAdvisory({ durationMin: 90, capacity: 1 })).toBeNull();
  });

  test("says nothing about a short group class", () => {
    expect(groupMeetAdvisory({ durationMin: 40, capacity: 5 })).toBeNull();
    expect(groupMeetAdvisory({ durationMin: 30, capacity: 2 })).toBeNull();
  });

  // The case that actually costs a teacher a lesson: 90 minutes advertised,
  // 60 minutes delivered, on any account that has not been upgraded.
  test("warns that a 90 minute group class will be cut short", () => {
    expect(groupMeetAdvisory({ durationMin: 90, capacity: 3 })).toEqual({
      kind: "DURATION_OVER_FREE_LIMIT",
      limitMin: 60,
      durationMin: 90,
    });
  });

  test("flags a 60 minute class as finishing on the buzzer", () => {
    expect(groupMeetAdvisory({ durationMin: 60, capacity: 3 })).toEqual({
      kind: "DURATION_AT_FREE_LIMIT",
      limitMin: 60,
    });
  });

  // The smallest possible group is teacher plus two, which is already three in
  // the call — so the cap applies from the very smallest class.
  test("applies from the smallest group upward", () => {
    expect(groupMeetAdvisory({ durationMin: 90, capacity: 2 })).toMatchObject({
      kind: "DURATION_OVER_FREE_LIMIT",
    });
  });

  test("warns when a class would seat more people than Meet allows", () => {
    expect(groupMeetAdvisory({ durationMin: 30, capacity: 120 })).toEqual({
      kind: "CAPACITY_OVER_MEET_LIMIT",
      limit: GOOGLE_MEET_MAX_PARTICIPANTS,
      participants: 121,
    });
  });

  test("counts the teacher against the participant cap", () => {
    // Exactly 100 in the room is fine; the teacher tips 100 students over.
    expect(groupMeetAdvisory({ durationMin: 30, capacity: 99 })).toBeNull();
    expect(groupMeetAdvisory({ durationMin: 30, capacity: 100 })).toMatchObject({
      kind: "CAPACITY_OVER_MEET_LIMIT",
    });
  });

  test("leads with capacity, which no duration can rescue", () => {
    expect(groupMeetAdvisory({ durationMin: 90, capacity: 200 })).toMatchObject({
      kind: "CAPACITY_OVER_MEET_LIMIT",
    });
  });

  test("the published limits are what the copy promises", () => {
    expect(GOOGLE_MEET_FREE_GROUP_CALL_MINUTES).toBe(60);
    expect(GOOGLE_MEET_MAX_PARTICIPANTS).toBe(100);
  });
});
