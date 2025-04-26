import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { Community, CreateCommunityPayload } from './types';

const COMMUNITIES_QUERY_KEY = ['communities'];

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