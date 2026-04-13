/** JSON shape returned by GET /api/study/queue for the practice session client. */

export type StudyQueueMcqCard = { id: string; kind: "mcq"; frontJa: string; options: string[] };

export type StudyQueueReorderCard = {
  id: string;
  kind: "reorder";
  frontJa: string;
  tokens: { id: string; text: string }[];
};

export type StudyQueueMultiStepCard = {
  id: string;
  kind: "multi_step";
  frontJa: string;
  steps: { prompt: string }[];
};

export type StudyQueueCard = StudyQueueMcqCard | StudyQueueReorderCard | StudyQueueMultiStepCard;
