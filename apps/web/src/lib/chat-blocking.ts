type ChatBlockingState = {
  studentId: string;
  teacherId: string;
  studentBlockedAt: Date | string | null;
  teacherBlockedAt: Date | string | null;
};

export function isViewerBlockedByCounterpart(
  thread: ChatBlockingState,
  viewerUserId: string,
) {
  if (viewerUserId === thread.studentId) {
    return Boolean(thread.teacherBlockedAt);
  }
  if (viewerUserId === thread.teacherId) {
    return Boolean(thread.studentBlockedAt);
  }
  return false;
}

export function isConversationBlocked(thread: ChatBlockingState) {
  return Boolean(thread.studentBlockedAt || thread.teacherBlockedAt);
}
