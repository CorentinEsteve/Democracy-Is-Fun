import { PartialUser } from "@/features/proposals/types"; // Re-use if suitable or define specific Author type

export interface Message {
  id: number;
  content: string;
  createdAt: string; // ISO Date string
  communityId: number;
  authorId: number;
  author: PartialUser; // Include author details
} 