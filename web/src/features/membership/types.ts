// Role enum - mirrors backend logic/expectations even if DB stores string
export enum MembershipRole {
    Admin = 'Admin',
    Member = 'Member',
}

// Base User information often included with Membership
interface BasicUser {
    id: number; // Assuming number based on schema
    name: string;
    avatarUrl?: string | null; 
}

// Combines Membership data with basic User details
export interface MembershipWithUser {
    userId: number;
    communityId: number;
    role: MembershipRole; // Use the enum
    points: number;
    joinedAt: string; // ISO Date string
    user: BasicUser;
}

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