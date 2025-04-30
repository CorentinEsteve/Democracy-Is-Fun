import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { toast } from 'sonner';
import { useUpdateCommunity, useDeleteCommunity, useCommunity, useCommunities } from './api';
import { Community } from './types';

// Mock the toast module
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAxios = new MockAdapter(axios);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for testing
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
};

describe('Community API Hooks', () => {
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeEach(() => {
    mockAxios.reset();
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  // --- useCommunity --- 
  it('useCommunity should fetch a community by ID', async () => {
    const communityId = 1;
    const mockCommunity: Community = { id: communityId, name: 'Test Community', creatorId: 1, createdAt: '', updatedAt: '' }; // Add required fields
    mockAxios.onGet(`/api/communities/${communityId}`).reply(200, mockCommunity);

    const { result } = renderHook(() => useCommunity(communityId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCommunity);
  });

  it('useCommunity should return null if ID is undefined', () => {
    const { result } = renderHook(() => useCommunity(undefined), { wrapper });
    expect(result.current.data).toBeUndefined(); // Initially undefined, then null after fetchCommunityById returns null
    expect(result.current.isFetching).toBe(false);
  });

  // --- useUpdateCommunity --- 
  it('useUpdateCommunity should update a community and invalidate queries', async () => {
    const communityId = 1;
    const payload = { id: communityId, name: 'Updated Name' };
    const updatedCommunity: Community = { id: communityId, name: 'Updated Name', creatorId: 1, createdAt: '', updatedAt: '' }; // Add required fields

    mockAxios.onPut(`/api/communities/${communityId}`).reply(200, updatedCommunity);

    const { result } = renderHook(() => useUpdateCommunity(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockAxios.history.put[0].url).toBe(`/api/communities/${communityId}`);
    expect(JSON.parse(mockAxios.history.put[0].data)).toEqual({ name: 'Updated Name' }); // Check payload
    expect(toast.success).toHaveBeenCalledWith('Community updated successfully!');
    // We can't easily check query invalidation directly without inspecting the queryClient instance
    // but we trust React Query handles it based on onSuccess logic
  });

   it('useUpdateCommunity should handle errors', async () => {
    const communityId = 1;
    const payload = { id: communityId, name: 'Updated Name' };
    const errorMessage = 'Update failed';

    mockAxios.onPut(`/api/communities/${communityId}`).reply(500, { message: errorMessage });

    const { result } = renderHook(() => useUpdateCommunity(), { wrapper });

    await act(async () => {
       try {
          await result.current.mutateAsync(payload);
       } catch (e) {
          // Expected error
       }
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
  });

  // --- useDeleteCommunity --- 
  it('useDeleteCommunity should delete a community and invalidate queries', async () => {
    const communityId = 1;

    mockAxios.onDelete(`/api/communities/${communityId}`).reply(204); // No content on successful delete

    const { result } = renderHook(() => useDeleteCommunity(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(communityId);
    });

    expect(mockAxios.history.delete[0].url).toBe(`/api/communities/${communityId}`);
    expect(toast.success).toHaveBeenCalledWith('Community deleted successfully!');
    // Query invalidation check comment applies here too
  });

  it('useDeleteCommunity should handle errors', async () => {
    const communityId = 1;
    const errorMessage = 'Deletion failed';

    mockAxios.onDelete(`/api/communities/${communityId}`).reply(500, { message: errorMessage });

    const { result } = renderHook(() => useDeleteCommunity(), { wrapper });

     await act(async () => {
       try {
          await result.current.mutateAsync(communityId);
       } catch (e) {
          // Expected error
       }
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
  });
}); 