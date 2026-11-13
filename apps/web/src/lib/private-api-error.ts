/** Safe machine-readable failures shared by private API adapters. */
export class PrivateApiFailure extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
