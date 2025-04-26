import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import apiClient from '@/api/axios';
import { useCommunities, useCreateCommunity } from './api'; // Assuming api.ts is in the same directory
import React from 'react';
import { Community, CreateCommunityPayload } from './types';

// Mock the API client
vi.mock('@/api/axios');
const mockedApiClient = vi.mocked(apiClient, true);

// React Query Client setup (shared instance for tests in this file)
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false, // Disable retries for tests
        },
    },
});

// Mock data
const mockCommunities: Community[] = [
  { id: 1, name: 'Community 1', creatorId: 1, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z', description: 'Desc 1', imageUrl: null },
  { id: 2, name: 'Community 2', creatorId: 2, createdAt: '2023-01-02T00:00:00Z', updatedAt: '2023-01-02T00:00:00Z', description: null, imageUrl: 'img.png' },
];

const newCommunityPayload: CreateCommunityPayload = {
    name: 'New Community',
    description: 'A great new place',
};

const createdCommunity: Community = {
    id: 3,
    ...newCommunityPayload,
    creatorId: 1,
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-03T00:00:00Z',
    imageUrl: undefined, // Ensure consistency with payload
};

describe('Community API Hooks', () => {

  // Clear cache and mocks before each test
  beforeEach(() => {
    queryClient.clear();
    mockedApiClient.get.mockClear();
    mockedApiClient.post.mockClear();
  });

  // Simple wrapper definition used directly in renderHook options
  const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

  describe('useCommunities', () => {
    it('should fetch communities successfully', async () => {
      mockedApiClient.get.mockResolvedValue({ data: mockCommunities });

      const { result } = renderHook(() => useCommunities(), {
          wrapper: wrapper // Pass the wrapper here
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApiClient.get).toHaveBeenCalledWith('/communities');
      expect(result.current.data).toEqual(mockCommunities);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch';
      mockedApiClient.get.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useCommunities(), {
          wrapper: wrapper // Pass the wrapper here
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(errorMessage);
    });
  });

  describe('useCreateCommunity', () => {
    it('should create a community successfully and invalidate query', async () => {
      mockedApiClient.post.mockResolvedValue({ data: createdCommunity });
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateCommunity(), {
          wrapper: wrapper // Pass the wrapper here
      });

      // Pre-populate cache for invalidation check
      queryClient.setQueryData(['communities'], mockCommunities);

      result.current.mutate(newCommunityPayload);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApiClient.post).toHaveBeenCalledWith('/communities', newCommunityPayload);
      expect(result.current.data).toEqual(createdCommunity);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['communities'] });
    });

     it('should handle creation error', async () => {
        const errorMessage = 'Creation failed';
        mockedApiClient.post.mockRejectedValue(new Error(errorMessage));

        const { result } = renderHook(() => useCreateCommunity(), {
             wrapper: wrapper // Pass the wrapper here
        });

        result.current.mutate(newCommunityPayload);

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.data).toBeUndefined();
        expect(result.current.error).toBeInstanceOf(Error);
        expect((result.current.error as Error).message).toBe(errorMessage);
    });
  });
}); 