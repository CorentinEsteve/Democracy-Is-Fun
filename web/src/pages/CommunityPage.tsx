import React from 'react';
import { useParams } from 'react-router-dom';
import { useProposals, useVoteOnProposal } from '@/features/proposals/api';
import ProposalList from '@/features/proposals/components/ProposalList';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import ChatPanel from '@/features/chat/components/ChatPanel'; // Placeholder
import { VoteType } from '@/features/proposals/types';

const CommunityPage: React.FC = () => {
  const { communityId: communityIdParam } = useParams<{ communityId: string }>();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  
  // Ensure communityId is a number before using it
  const communityId = communityIdParam ? parseInt(communityIdParam, 10) : undefined;

  const { data: proposals, isLoading, error, isError } = useProposals(communityId);
  const { mutate: voteOnProposal, isPending: isVoting } = useVoteOnProposal(communityId);

  const handleVote = (proposalId: number, voteType: VoteType) => {
    if (!isVoting) {
      voteOnProposal({ id: proposalId, voteType });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full" data-testid="loading-indicator">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (isError) {
      return <p className="text-red-500 text-center">Error loading proposals: {error?.message}</p>;
    }

    return (
      <ProposalList 
        proposals={proposals || []} 
        onVote={handleVote} 
        currentUserId={currentUserId}
      />
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 h-full">
      {/* Left Column: Chat Panel */}
      <div className="md:col-span-1 h-full">
        <ChatPanel />
      </div>

      {/* Right Column: Proposals Panel */}
      <div className="md:col-span-2 h-full flex flex-col">
        <h2 className="text-2xl font-semibold mb-4">Proposals</h2>
        <div className="flex-grow overflow-hidden">
             {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CommunityPage; 