export type QueueStatus = "waiting" | "called" | "served" | "cancelled";

export type QueueStatusPayload = {
  storeName: string;
  entryId: string | null;
  status: QueueStatus | "not_joined";
  queueNumber: number | null;
  position: number | null;
  peopleAhead: number | null;
  waitingCount: number;
  message: string;
};
