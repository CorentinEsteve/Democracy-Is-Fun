import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { useAuth } from '@/contexts/AuthContext'; // Assuming token is needed
// import { MembershipRole } from '@prisma/client'; // Removed prisma import
import { MembershipWithUser, MembershipRole } from './types'; // Import local types

// --- Fetch Members --- 
const fetchMembers = async (communityId: number, token: string | null): Promise<MembershipWithUser[]> => {
    if (!token) throw new Error('Authentication required');
    const response = await apiClient.get(`/communities/${communityId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const useMembers = (communityId: number | undefined) => {
    const { token } = useAuth();
    return useQuery<MembershipWithUser[], Error>({
        queryKey: ['members', communityId],
        queryFn: () => fetchMembers(communityId!, token),
        enabled: !!communityId && !!token,
    });
};

// --- Add Member --- 
interface AddMemberPayload {
    communityId: number;
    userIdentifier: string; // Can be user ID or email
}

const addMember = async (payload: AddMemberPayload, token: string | null): Promise<MembershipWithUser> => {
    if (!token) throw new Error('Authentication required');
    const { communityId, userIdentifier } = payload;
    const response = await apiClient.post(`/communities/${communityId}/members`, 
        { userIdentifier }, // Send identifier in request body
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return response.data; // Assuming API returns the new member details
};

export const useAddMember = () => {
    const queryClient = useQueryClient();
    const { token } = useAuth();

    return useMutation<MembershipWithUser, Error, AddMemberPayload>({
        mutationFn: (payload) => addMember(payload, token),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
        },
        onError: (error) => {
            console.error("Error adding member:", error);
            // Handle error (e.g., show toast notification)
        },
    });
};

// --- Remove Member --- 
interface RemoveMemberPayload {
    communityId: number;
    userId: number; // ID of the user to remove
}

const removeMember = async (payload: RemoveMemberPayload, token: string | null): Promise<void> => {
    if (!token) throw new Error('Authentication required');
    const { communityId, userId } = payload;
    await apiClient.delete(`/communities/${communityId}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
};

export const useRemoveMember = () => {
    const queryClient = useQueryClient();
    const { token } = useAuth();

    return useMutation<void, Error, RemoveMemberPayload>({
        mutationFn: (payload) => removeMember(payload, token),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
        },
         onError: (error) => {
            console.error("Error removing member:", error);
             // Handle error
        },
    });
};

// --- Update Member Role --- 
interface UpdateMemberPayload {
    communityId: number;
    userId: number;
    role: MembershipRole; // Use enum type if defined
}

const updateMemberRole = async (payload: UpdateMemberPayload, token: string | null): Promise<MembershipWithUser> => {
    if (!token) throw new Error('Authentication required');
    const { communityId, userId, role } = payload;
    const response = await apiClient.patch(`/communities/${communityId}/members/${userId}`, 
        { role }, // Send role in request body
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return response.data; // Assuming API returns the updated member details
};

export const useUpdateMember = () => {
    const queryClient = useQueryClient();
    const { token } = useAuth();

    return useMutation<MembershipWithUser, Error, UpdateMemberPayload>({
        mutationFn: (payload) => updateMemberRole(payload, token),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
        },
        onError: (error) => {
            console.error("Error updating member role:", error);
            // Handle error (e.g., show toast notification)
        },
    });
}; 