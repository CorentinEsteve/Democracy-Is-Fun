import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCommunity } from '@/features/communities/api';
import { Community, Membership } from '@/features/communities/types';
import { CommunitySettingsModal } from '@/features/communities/components/CommunitySettingsModal';
import { useProposals, useVoteOnProposal } from '@/features/proposals/api';
import ProposalList from '@/features/proposals/components/ProposalList';
import CreateProposalModal from '@/features/proposals/components/CreateProposalModal';
import { ManageMembersModal } from '@/features/members/components/ManageMembersModal';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, PlusCircle, Users, Settings } from 'lucide-react';
// import ChatPanel from '@/features/chat/components/ChatPanel'; // Remove placeholder if it exists
import MessageList from '@/features/chat/components/MessageList';
import MessageInput from '@/features/chat/components/MessageInput';
import { VoteType, Proposal } from '@/features/proposals/types';
import { Button } from '@/components/ui/button';
import { MembershipRole } from '@/features/membership/types';

const CommunityPage: React.FC = () => {
  const { communityId: communityIdParam } = useParams<{ communityId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = user?.id ? Number(user.id) : null;
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const communityId = communityIdParam ? parseInt(communityIdParam, 10) : undefined;

  const { data: community, isLoading: isLoadingCommunity, error: communityError } = useCommunity(communityId);

  const { data: proposals, isLoading: isLoadingProposals, error: proposalsError, isError: isProposalsError } = useProposals(communityId);
  const { mutate: voteOnProposal, isPending: isVoting } = useVoteOnProposal(communityId);

  const handleVote = (proposalId: number, voteType: VoteType) => {
    if (!isVoting && communityId) {
      voteOnProposal({ id: proposalId, voteType });
    }
  };

  const currentUserMembership = community?.memberships?.find((m: Membership) => m.userId === currentUserId);
  const isAdmin = currentUserMembership?.role === MembershipRole.Admin;

  if (communityId === undefined || isNaN(communityId)) {
    return <div className="p-4 text-red-500">Invalid Community ID specified.</div>;
  }

  if (isLoadingCommunity) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading Community...</p>
      </div>
    );
  }
  
  if (communityError) {
    return <p className="text-red-500 text-center">Error loading community: {communityError.message}</p>;
  }

  if (!community) {
    navigate('/communities', { replace: true });
    return <p className="text-orange-500 text-center">Community not found or you do not have access.</p>;
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-4rem)] bg-[#f5f7fa]">
      <div className="md:col-span-1 h-full flex flex-col bg-card rounded-lg shadow border p-4 bg-white">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Community Chat</h2>
         <div className="flex-grow overflow-y-auto mb-4">
             <MessageList communityId={communityId} />
         </div>
        <MessageInput communityId={communityId} />
      </div>

      <div className="md:col-span-2 h-full flex flex-col">
         <div className="flex justify-between items-center mb-4 px-4 pt-4">
            <h2 className="text-2xl font-semibold">Proposals for {community.name}</h2>
            <div className="flex items-center space-x-2">
                {isAdmin && (
                    <ManageMembersModal 
                        communityId={communityId}
                        trigger={
                            <Button variant="outline" size="icon" title="Manage Members">
                                <Users className="h-4 w-4" />
                            </Button>
                        }
                    />
                )}
                
                <CreateProposalModal communityId={communityId}>
                    <Button size="icon" title="New Proposal">
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </CreateProposalModal>

                {isAdmin && (
                    <Button 
                        variant="outline" 
                        size="icon" 
                        title="Community Settings" 
                        onClick={() => setIsSettingsModalOpen(true)}
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
        <div className="flex-grow overflow-y-auto px-4 pb-4">
             {renderProposalsContent()}
        </div>
      </div>

      {isAdmin && community && (
        <CommunitySettingsModal
          community={community}
          isOpen={isSettingsModalOpen}
          onOpenChange={setIsSettingsModalOpen}
        />
      )}
    </div>
  );
};

export default CommunityPage; 