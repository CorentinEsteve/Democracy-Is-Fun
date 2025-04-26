import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import apiClient from '@/api/axios';
import { useProposals, useVoteOnProposal } from './api';
import { Proposal, PartialUser, Vote, VoteType } from './types';
import React from 'react';

// Mock apiClient
vi.mock('@/api/axios');
const mockedApiClient = vi.mocked(apiClient, true);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }, // Disable retries for tests
  },
});

// Simplest wrapper definition, avoiding destructuring
const wrapper = (props: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
);

// Sample data
const mockUser: PartialUser = { id: 1, name: 'Test Voter' };
const mockInitiator: PartialUser = { id: 2, name: 'Test Initiator' };
const mockProposals: Proposal[] = [
  {
    id: 101,
    communityId: 1,
    initiatorId: mockInitiator.id,
    title: 'Proposal 1',
    description: 'Desc 1',
    location: 'Loc 1',
    dateTime: new Date().toISOString(),
    tags: ['test', 'api'],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    quorumPct: 50,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    initiator: mockInitiator,
    votes: [],
    waitingVoters: [mockUser],
  },
];

describe('Proposals API Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('useProposals', () => {
    it('fetches proposals successfully', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockProposals });
      const communityId = 1;

      const { result } = renderHook(() => useProposals(communityId), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApiClient.get).toHaveBeenCalledWith(`/communities/${communityId}/proposals`);
      expect(result.current.data).toEqual(mockProposals);
      expect(result.current.error).toBeNull();
    });

    it('handles fetch proposals error', async () => {
      const error = new Error('Failed to fetch');
      mockedApiClient.get.mockRejectedValueOnce(error);
      const communityId = 1;

      const { result } = renderHook(() => useProposals(communityId), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBe(error);
    });

    it('does not fetch if communityId is undefined', () => {
      const { result } = renderHook(() => useProposals(undefined), { wrapper });
      expect(mockedApiClient.get).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false); // Should not be loading if disabled
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useVoteOnProposal', () => {
    it('calls vote API and invalidates proposals query on success', async () => {
      mockedApiClient.post.mockResolvedValueOnce({}); // Simulate successful vote post
      const queryClientSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const communityId = 1;
      const proposalId = 101;
      const voteType: VoteType = 'For';

      const { result } = renderHook(() => useVoteOnProposal(communityId), { wrapper });

      result.current.mutate({ id: proposalId, voteType });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApiClient.post).toHaveBeenCalledWith(`/proposals/${proposalId}/vote`, { voteType });
      expect(queryClientSpy).toHaveBeenCalledWith({ queryKey: ['proposals', communityId] });
    });

     it('handles vote API error', async () => {
      const error = new Error('Vote failed');
      mockedApiClient.post.mockRejectedValueOnce(error);
       const queryClientSpy = vi.spyOn(queryClient, 'invalidateQueries');
       const communityId = 1;
       const proposalId = 101;
       const voteType: VoteType = 'Against';

      const { result } = renderHook(() => useVoteOnProposal(communityId), { wrapper });

      result.current.mutate({ id: proposalId, voteType });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(queryClientSpy).not.toHaveBeenCalled(); // Should not invalidate on error
    });
  });
}); 