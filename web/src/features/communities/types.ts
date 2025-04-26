export interface Community {
  id: number;
  name: string;
  description?: string | null; // Optional based on schema
  imageUrl?: string | null;    // Optional based on schema
  creatorId: number;
  createdAt: string; // Or Date if you parse it
  updatedAt: string; // Or Date
  // Add other fields like memberships if needed by the UI directly
}

export interface CreateCommunityPayload {
  name: string;
  description?: string;
  imageUrl?: string;
} 