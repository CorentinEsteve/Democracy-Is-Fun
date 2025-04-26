import React from 'react';
import { Proposal, VoteType } from '../types';
import ProposalCard from './ProposalCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProposalListProps {
  proposals: Proposal[];
  onVote: (proposalId: number, voteType: VoteType) => void;
  currentUserId: number | null;
}

const ProposalList: React.FC<ProposalListProps> = ({ proposals, onVote, currentUserId }) => {
  if (!proposals || proposals.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No active proposals.</p>;
  }

  return (
    <ScrollArea className="h-[calc(100vh-150px)] pr-4"> {/* Adjust height as needed */} 
      <div className="space-y-4">
        {proposals.map((proposal) => (
          <ProposalCard 
            key={proposal.id} 
            proposal={proposal} 
            onVote={onVote} 
            currentUserId={currentUserId} 
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default ProposalList; 