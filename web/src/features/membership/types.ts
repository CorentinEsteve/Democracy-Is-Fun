// Define role enum locally for frontend use
export enum MembershipRole {
    Admin = 'Admin',
    Member = 'Member',
}

// Define User details needed within MembershipWithUser
// (Assuming a global User type isn't readily available/imported here)
interface UserSubset {
  id: number;
  name: string;
  avatarUrl?: string | null;
}

// Define type directly matching the API response structure
export type MembershipWithUser = {
   // Fields directly from the Membership model
   userId: number;
   communityId: number;
   role: MembershipRole;
   points: number;
   joinedAt: string; // Or Date, depending on API serialization
   membershipId: number; // Assuming Prisma adds this based on @@id([userId, communityId]) or a separate ID

   // Nested user object
   user: UserSubset;
};

// Type for adding a member payload
export interface AddMemberPayload {
    communityId: number;
    userIdentifier: string; // Can be user ID or email
}

// Type for removing a member payload (if needed elsewhere, otherwise inline is fine)
export interface RemoveMemberPayload {
    communityId: number;
    userId: number; // ID of the user to remove
} 