import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptIntegrationToken } from "@/lib/calendar-token";

async function getOauthClientForUser(userId: string) {
  const account = await prisma.googleIntegrationAccount.findUnique({
    where: { userId },
    select: { refreshToken: true, revoked: true },
  });
  if (!account?.refreshToken || account.revoked) return null;
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({
    refresh_token: decryptIntegrationToken(account.refreshToken),
  });
  return oauth2;
}

export async function createMeetingSummaryDoc(params: {
  organizerUserId: string;
  title: string;
  summary: string;
  attendeeEmails: string[];
}) {
  const oauth2 = await getOauthClientForUser(params.organizerUserId);
  if (!oauth2) return null;
  const [drive, docs, settings] = await Promise.all([
    google.drive({ version: "v3", auth: oauth2 }),
    google.docs({ version: "v1", auth: oauth2 }),
    prisma.googleIntegrationSettings.findUnique({
      where: { userId: params.organizerUserId },
      select: { driveConnected: true, defaultNotesFolderId: true, autoShareNotesWithAttendees: true },
    }),
  ]);
  if (!settings?.driveConnected) return null;

  const created = await docs.documents.create({
    requestBody: { title: params.title },
  });
  const docId = created.data.documentId;
  if (!docId) return null;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: params.summary,
          },
        },
      ],
    },
  });

  if (settings.defaultNotesFolderId) {
    await drive.files.update({
      fileId: docId,
      addParents: settings.defaultNotesFolderId,
    });
  }

  if (settings.autoShareNotesWithAttendees) {
    await Promise.all(
      params.attendeeEmails.map((email) =>
        drive.permissions.create({
          fileId: docId,
          requestBody: {
            role: "writer",
            type: "user",
            emailAddress: email,
          },
          sendNotificationEmail: false,
        }),
      ),
    );
  }

  return docId;
}

export async function syncMeetingArtifacts(params: {
  organizerUserId: string;
  bookingId: string;
}) {
  const settings = await prisma.googleIntegrationSettings.findUnique({
    where: { userId: params.organizerUserId },
    select: { meetConnected: true, artifactSyncEnabled: true },
  });
  if (!settings?.meetConnected || !settings.artifactSyncEnabled) {
    return { transcriptArtifactIds: [], smartNotesIds: [], recordingIds: [] };
  }
  // Meet artifact APIs are still evolving; persist placeholders for async worker pickup.
  return {
    transcriptArtifactIds: [`booking:${params.bookingId}:transcript`],
    smartNotesIds: [`booking:${params.bookingId}:smart-notes`],
    recordingIds: [`booking:${params.bookingId}:recording`],
  };
}
