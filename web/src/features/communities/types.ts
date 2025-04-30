// Corresponds to Prisma schema, using string for Role as per schema
export interface Membership {
  userId: number; // Assuming user ID is number based on schema
  communityId: number;
  role: string; // Using string as Role enum is not used in Prisma schema
  points: number;
  joinedAt: string; // ISO Date string
  // Add user details if needed/included by API
  // user?: { id: number; name: string; avatarUrl: string | null }; 
}

export interface Community {
  id: number; // Changed to number based on CommunityPage usage
  name: string;
  description: string | null;
  imageUrl: string | null;
  creatorId: number; // Assuming number based on schema
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  memberships?: Membership[]; // Added memberships relation
  // Include creator details if needed/provided by API
  // creator?: { id: number; name: string };
}

// Payload for creating a community
export interface CreateCommunityPayload {
  name: string;
  description?: string;
  imageUrl?: string;
} 