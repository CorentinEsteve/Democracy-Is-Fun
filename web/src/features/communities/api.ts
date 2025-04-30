import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { Community, CreateCommunityPayload, Membership } from './types';
import { toast } from 'sonner';

const COMMUNITIES_QUERY_KEY = ['communities'];
const COMMUNITY_QUERY_KEY = 'community';

// Fetch all communities for the user
const fetchCommunities = async (): Promise<Community[]> => {
  const { data } = await apiClient.get<Community[]>('/communities');
  return data;
};

export const useCommunities = () => {
  return useQuery({
    queryKey: COMMUNITIES_QUERY_KEY,
    queryFn: fetchCommunities,
  });
};

// Fetch a single community by ID
const fetchCommunityById = async (id: number | undefined): Promise<Community | null> => {
  if (!id) return null; // Don't fetch if ID is undefined
  try {
    const { data } = await apiClient.get<Community>(`/communities/${id}`);
    return data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null; // Return null if not found
    }
    throw error; // Re-throw other errors
  }
};

export const useCommunity = (id: number | undefined) => {
  return useQuery<Community | null, Error>({
    queryKey: [COMMUNITY_QUERY_KEY, id], // Include ID in the query key
    queryFn: () => fetchCommunityById(id),
    enabled: !!id, // Only run the query if id is truthy
  });
};

// Create a new community
const createCommunity = async (payload: CreateCommunityPayload): Promise<Community> => {
  const { data } = await apiClient.post<Community>('/communities', payload);
  return data;
};

export const useCreateCommunity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCommunity,
    onSuccess: () => {
      // Invalidate and refetch the communities list after creation
      queryClient.invalidateQueries({ queryKey: COMMUNITIES_QUERY_KEY });
    },
    // Optional: onError handling
  });
};

interface UpdateCommunityPayload {
  id: number; // Changed id to number based on CommunityPage usage
  name?: string;
  description?: string;
  imageUrl?: string;
}

export const useUpdateCommunity = () => {
  const queryClient = useQueryClient();

  return useMutation<Community, Error, UpdateCommunityPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiClient.patch<Community>(`/communities/${id}`, payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Community updated successfully!');
      // Invalidate queries for the list of communities and the specific community
      queryClient.invalidateQueries({ queryKey: COMMUNITIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [COMMUNITY_QUERY_KEY, variables.id] });
       // Optionally update the cache directly
      queryClient.setQueryData([COMMUNITY_QUERY_KEY, variables.id], data);
    },
    onError: (error) => {
      toast.error(`Failed to update community: ${error.message}`);
    },
  });
};

export const useDeleteCommunity = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({ // Changed id type to number
    mutationFn: async (id) => {
       await apiClient.delete(`/communities/${id}`);
    },
    onSuccess: (_, id) => {
      toast.success('Community deleted successfully!');
      // Invalidate the list of communities query
      queryClient.invalidateQueries({ queryKey: COMMUNITIES_QUERY_KEY });
      // Remove the specific community query from cache if it exists
      queryClient.removeQueries({ queryKey: [COMMUNITY_QUERY_KEY, id] });
    },
    onError: (error) => {
      toast.error(`Failed to delete community: ${error.message}`);
    },
  });
}; 