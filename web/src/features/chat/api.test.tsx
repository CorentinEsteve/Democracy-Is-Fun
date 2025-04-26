import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import apiClient from '@/api/axios';
import { useMessages, useCreateMessage } from './api';
import { Message } from './types';
import React, { ReactNode, FC } from 'react';

// Mock the API client
vi.mock('@/api/axios');
const mockedApiClient = vi.mocked(apiClient);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
});

// Explicitly type the wrapper component
const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
// const wrapper = ({ children }: any) => ( // Use any as a diagnostic step
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Chat API Hooks', () => {
  const communityId = 1;

  beforeEach(() => {
    // Reset mocks and clear cache before each test
    vi.clearAllMocks();
    queryClient.clear();
  });

  // --- useMessages --- 
  describe('useMessages', () => {
    it('should fetch messages successfully', async () => {
      const mockMessages: Message[] = [
        { id: 1, content: 'Msg 1', createdAt: new Date().toISOString(), communityId, authorId: 1, author: { id: 1, name: 'A' } },
        { id: 2, content: 'Msg 2', createdAt: new Date().toISOString(), communityId, authorId: 2, author: { id: 2, name: 'B' } },
      ];
      // Mock GET request
      mockedApiClient.get.mockResolvedValue({ data: mockMessages });

      const { result } = renderHook(() => useMessages(communityId), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApiClient.get).toHaveBeenCalledWith(`/communities/${communityId}/messages`);
      // Messages are reversed in the hook
      expect(result.current.data).toEqual(mockMessages.reverse()); 
    });

    it('should return error state on fetch failure', async () => {
      const error = new Error('Network Error');
      mockedApiClient.get.mockRejectedValue(error);

      const { result } = renderHook(() => useMessages(communityId), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBe(error);
    });

     it('should be disabled if communityId is undefined', () => {
        const { result } = renderHook(() => useMessages(undefined), { wrapper });
        expect(result.current.isLoading).toBe(false); // Should not be loading
        expect(result.current.isFetching).toBe(false);
        expect(mockedApiClient.get).not.toHaveBeenCalled();
    });

    // Polling is harder to test precisely without advancing timers
    // We can check if refetchInterval is set
     it('should have refetchInterval configured', () => {
        const { result } = renderHook(() => useMessages(communityId), { wrapper });
        // Access internal query object state (use sparingly)
        const query = queryClient.getQueryCache().find({ queryKey: ['chatMessages', communityId] });
        expect(query?.options.refetchInterval).toBe(5000);
    });
  });

  // --- useCreateMessage ---
  describe('useCreateMessage', () => {
     it('should call create message API and invalidate query on success', async () => {
        const mockNewMessage: Message = { 
            id: 3, 
            content: 'New Msg', 
            createdAt: new Date().toISOString(), 
            communityId, 
            authorId: 1, 
            author: { id: 1, name: 'A' } 
        };
        const payload = { communityId, content: 'New Msg' };
        mockedApiClient.post.mockResolvedValue({ data: mockNewMessage });
        const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useCreateMessage(), { wrapper });

        await result.current.mutateAsync(payload);

        expect(mockedApiClient.post).toHaveBeenCalledWith(`/communities/${communityId}/messages`, { content: payload.content });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['chatMessages', communityId] });
    });

     it('should handle API error during message creation', async () => {
        const error = new Error('Failed to post');
        const payload = { communityId, content: 'Will Fail' };
        mockedApiClient.post.mockRejectedValue(error);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error

        const { result } = renderHook(() => useCreateMessage(), { wrapper });

        await expect(result.current.mutateAsync(payload)).rejects.toThrow('Failed to post');
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating message:", error);

        consoleErrorSpy.mockRestore(); // Restore console.error
    });
  });
}); 