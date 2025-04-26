import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { useAuth } from '@/contexts/AuthContext'; // Assuming token is needed

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

// --- Fetch Members --- 
const fetchMembers = async (communityId: number, token: string | null): Promise<Member[]> => {
    if (!token) throw new Error('Authentication required');
    const response = await apiClient.get(`/communities/${communityId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const useMembers = (communityId: number | undefined) => {
    const { token } = useAuth();
    return useQuery<Member[], Error>({
        queryKey: ['members', communityId], // Include communityId in the queryKey
        queryFn: () => fetchMembers(communityId!, token),
        enabled: !!communityId && !!token, // Only run query if communityId and token are available
    });
};

// --- Add Member --- 
interface AddMemberPayload {
    communityId: number;
    userIdentifier: string; // Can be user ID or email
}

const addMember = async (payload: AddMemberPayload, token: string | null): Promise<Member> => {
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

    return useMutation<Member, Error, AddMemberPayload>({
        mutationFn: (payload) => addMember(payload, token),
        onSuccess: (data, variables) => {
            // Invalidate members query to refetch the list
            queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
            // Optionally update the cache directly for faster UI update
            // queryClient.setQueryData(['members', variables.communityId], (oldData: Member[] | undefined) => 
            //    oldData ? [...oldData, data] : [data]
            // );
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
            // Invalidate members query to refetch
            queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
            // Optionally update cache by removing the member
            // queryClient.setQueryData(['members', variables.communityId], (oldData: Member[] | undefined) => 
            //    oldData ? oldData.filter(member => member.id !== variables.userId) : []
            // );
        },
         onError: (error) => {
            console.error("Error removing member:", error);
             // Handle error
        },
    });
}; 