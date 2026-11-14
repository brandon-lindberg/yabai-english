import "server-only";
// Keep the locked SDK's Calendar/OAuth implementation without loading every API.
import { auth, calendar, type calendar_v3 } from "googleapis/build/src/apis/calendar";

type GoogleCredentials = { clientId: string; clientSecret: string };
export type GoogleCalendarClient = calendar_v3.Calendar;
export type GoogleCalendarEvent = calendar_v3.Schema$Event;

export function createGoogleOAuthClient({ clientId, clientSecret, redirectUri }: GoogleCredentials & { redirectUri?: string }) {
  return new auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function createGoogleCalendarClient({ refreshToken, ...credentials }: GoogleCredentials & { refreshToken: string }): GoogleCalendarClient {
  // OAuth clients hold mutable credentials: create one per operation, never per process.
  const oauth = createGoogleOAuthClient(credentials);
  oauth.setCredentials({ refresh_token: refreshToken });
  return calendar({ version: "v3", auth: oauth });
}
