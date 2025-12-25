export type ThreadStatus = "regular" | "archived" | "pending";

export type ThreadMetadata = {
  title: string;
  status: ThreadStatus;
  lastActiveAt?: string | number;
};
