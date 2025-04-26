import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { Message } from './types'; // Assuming types.ts exists/will be created

const CHAT_QUERY_KEY = 'chatMessages';

// Fetch messages for a specific community
const fetchMessages = async (communityId: number): Promise<Message[]> => {
  const response = await apiClient.get(`/communities/${communityId}/messages`);
  // Reverse messages so newest are at the bottom for display
  return (response.data as Message[]).reverse(); 
};

export const useMessages = (communityId: number | undefined) => {
  return useQuery<Message[], Error>({
    queryKey: [CHAT_QUERY_KEY, communityId],
    queryFn: () => fetchMessages(communityId!),
    enabled: !!communityId,
    refetchInterval: 5000, // Poll every 5 seconds
    refetchIntervalInBackground: true, // Keep polling even if tab is inactive
  });
};

// Create a new message
export interface CreateMessagePayload {
  communityId: number;
  content: string;
}

const createMessage = async (payload: CreateMessagePayload): Promise<Message> => {
  const { communityId, content } = payload;
  const response = await apiClient.post(`/communities/${communityId}/messages`, { content });
  return response.data;
};

export const useCreateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<Message, Error, CreateMessagePayload>({
    mutationFn: createMessage,
    onSuccess: (/* newMessage */ data, variables) => {
      // Invalidate messages for this community on successful creation
      queryClient.invalidateQueries({ 
        queryKey: [CHAT_QUERY_KEY, variables.communityId]
      });
      // Optimistic update could be added here for smoother UX
    },
    onError: (error) => {
      console.error("Error creating message:", error);
      // Potentially show an error toast
    }
  });
}; 