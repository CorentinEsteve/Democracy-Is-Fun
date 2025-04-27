// Define the Member type (adjust based on actual API response)
export interface Member {
    id: number; // User ID
    name: string;
    email?: string; // Optional, depending on what the API returns
    avatarUrl?: string;
    membershipId: number; // The ID of the Membership record itself
    role: 'Admin' | 'Member';
    points: number;
    // Add other relevant fields like join date if available
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