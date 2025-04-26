import React from 'react';
import { useParams } from 'react-router-dom';
import { useProposals, useVoteOnProposal } from '@/features/proposals/api';
import ProposalList from '@/features/proposals/components/ProposalList';
import CreateProposalModal from '@/features/proposals/components/CreateProposalModal';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, PlusCircle } from 'lucide-react';
// import ChatPanel from '@/features/chat/components/ChatPanel'; // Remove placeholder if it exists
import MessageList from '@/features/chat/components/MessageList';
import MessageInput from '@/features/chat/components/MessageInput';
import { VoteType } from '@/features/proposals/types';
import { Button } from '@/components/ui/button';

const CommunityPage: React.FC = () => {
  const { communityId: communityIdParam } = useParams<{ communityId: string }>();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  
  const communityId = communityIdParam ? parseInt(communityIdParam, 10) : undefined;

  const { data: proposals, isLoading: isLoadingProposals, error: proposalsError, isError: isProposalsError } = useProposals(communityId);
  const { mutate: voteOnProposal, isPending: isVoting } = useVoteOnProposal(communityId);

  const handleVote = (proposalId: number, voteType: VoteType) => {
    if (!isVoting && communityId) {
      voteOnProposal({ id: proposalId, voteType });
    }
  };

  if (!communityId) {
    return <div className="p-4 text-red-500">Invalid Community ID</div>;
  }

  const renderProposalsContent = () => {
    if (isLoadingProposals) {
      return (
        <div className="flex justify-center items-center h-full" data-testid="loading-proposals-indicator">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (isProposalsError) {
      return <p className="text-red-500 text-center">Error loading proposals: {proposalsError?.message}</p>;
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 h-[calc(100vh-theme_header_height)]"> {/* Adjust height based on layout */}
      {/* Left Column: Chat Panel */}
      <div className="md:col-span-1 h-full flex flex-col bg-card rounded-lg shadow border p-4">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Community Chat</h2>
         <div className="flex-grow overflow-hidden mb-4">
             <MessageList communityId={communityId} />
         </div>
        <MessageInput communityId={communityId} />
      </div>

      {/* Right Column: Proposals Panel */}
      <div className="md:col-span-2 h-full flex flex-col">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Proposals</h2>
            <CreateProposalModal communityId={communityId}>
                 <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Proposal
                 </Button>
            </CreateProposalModal>
        </div>
        <div className="flex-grow overflow-hidden">
             {renderProposalsContent()}
        </div>
      </div>
    </div>
  );
};

export default CommunityPage; 