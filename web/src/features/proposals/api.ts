import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { Proposal, VoteType } from './types';

const PROPOSALS_QUERY_KEY = 'proposals';

// Fetch proposals for a specific community
const fetchProposals = async (communityId: number): Promise<Proposal[]> => {
  const response = await apiClient.get(`/communities/${communityId}/proposals`);
  return response.data;
};

export const useProposals = (communityId: number | undefined) => {
  return useQuery<Proposal[], Error>({
    queryKey: [PROPOSALS_QUERY_KEY, communityId],
    queryFn: () => fetchProposals(communityId!),
    enabled: !!communityId, // Only run query if communityId is available
  });
};

// Vote on a proposal
interface VotePayload {
  id: number;
  voteType: VoteType;
}

const voteOnProposal = async ({ id, voteType }: VotePayload): Promise<void> => {
  await apiClient.post(`/proposals/${id}/vote`, { voteType });
};

export const useVoteOnProposal = (communityId: number | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, VotePayload>({
    mutationFn: voteOnProposal,
    onSuccess: (_, variables) => {
      // Invalidate the proposals query for the specific community to refetch
      queryClient.invalidateQueries({
        queryKey: [PROPOSALS_QUERY_KEY, communityId],
      });
        // Potentially invalidate other related queries if necessary, e.g., user points
    },
    onError: (error) => {
      // Handle or log error globally/locally if needed
      console.error("Error voting on proposal:", error);
    }
  });
}; 