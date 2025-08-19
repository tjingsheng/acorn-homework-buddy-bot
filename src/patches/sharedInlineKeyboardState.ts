export type TrackedMessage = {
  messageId: number;
  originalText: string;
  buttons: { text: string; data: string }[];
  used: boolean;
};

export const activeInlineKeyboards = new Map<string, TrackedMessage>();
