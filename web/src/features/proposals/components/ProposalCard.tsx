import React, { useState, useEffect } from 'react';
import { formatDistanceToNowStrict, parseISO, isPast } from 'date-fns';
import { ThumbsUp, ThumbsDown, Hand } from 'lucide-react';

import { Proposal, VoteType, PartialUser, Vote } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useMembers } from '@/features/membership/api';

interface ProposalCardProps {
  proposal: Proposal;
  onVote: (proposalId: number, voteType: VoteType) => void;
  currentUserId: number | null;
}

const getInitials = (name: string = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onVote, currentUserId }) => {
  const { data: members = [] } = useMembers(proposal.communityId);

  const userVote = proposal.votes.find((v) => v.voterId === currentUserId);
  const hasVoted = !!userVote;
  const deadlineDate = parseISO(proposal.deadline);
  const isDeadlinePassed = isPast(deadlineDate);
  const isActive = proposal.status === 'Active' && !isDeadlinePassed;

  const getVoteCount = (type: VoteType) => proposal.votes.filter(v => v.voteType === type).length;

  const handleVote = (voteType: VoteType) => {
    if (!currentUserId || !isActive) return;
    onVote(proposal.id, voteType);
  };

  const cardClasses = cn(
    'transition-shadow duration-300',
    isActive && !hasVoted && 'shadow-lg shadow-green-500/30',
    isActive && hasVoted && 'shadow-lg shadow-blue-500/30'
  );

  const voteCountFor = getVoteCount('For');
  const voteCountAgainst = getVoteCount('Against');
  const voteCountNeutral = getVoteCount('Neutral');

  const totalMembers = members.length;
  const votesCount = proposal.votes.length;

  return (
    <Card className={cardClasses}>
      <CardHeader>
        <CardTitle className="text-lg">{proposal.title}</CardTitle>
        <div className="text-xs text-muted-foreground flex items-center space-x-1 pt-1">
           <Avatar className="h-4 w-4">
                <AvatarImage src={proposal.initiator.avatarUrl ?? undefined} alt={proposal.initiator.name} />
                <AvatarFallback className="text-[8px]">{getInitials(proposal.initiator.name)}</AvatarFallback>
            </Avatar>
           <span>{proposal.initiator.name}</span>
        </div>
         {proposal.location && <p className="text-sm text-muted-foreground pt-1">{proposal.location}</p>}
         {proposal.dateTime && <p className="text-sm text-muted-foreground">{new Date(proposal.dateTime).toLocaleString()}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {proposal.description && <p className="text-sm">{proposal.description}</p>}
        <div className="flex flex-wrap gap-1">
          {proposal.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-3">
         <div className="flex justify-between w-full items-center">
            <div className="text-sm text-muted-foreground">
                {isDeadlinePassed ? (
                    <span className="text-red-500">Expired</span>
                ) : (
                    <span>
                        Time left: {formatDistanceToNowStrict(deadlineDate, { addSuffix: false })}
                    </span>
                )}
            </div>
            <div className="flex space-x-1" data-testid="vote-buttons">
                <Button 
                    variant={userVote?.voteType === 'For' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => handleVote('For')} 
                    disabled={!isActive || !currentUserId}
                    className="px-2 py-1 h-auto"
                    aria-label={`Vote For (${voteCountFor} votes)`}
                >
                    <ThumbsUp className="h-4 w-4 mr-1" /> {voteCountFor}
                </Button>
                <Button 
                    variant={userVote?.voteType === 'Against' ? 'destructive' : 'outline'} 
                    size="sm" 
                    onClick={() => handleVote('Against')} 
                    disabled={!isActive || !currentUserId}
                    className="px-2 py-1 h-auto"
                    aria-label={`Vote Against (${voteCountAgainst} votes)`}
                >
                    <ThumbsDown className="h-4 w-4 mr-1" /> {voteCountAgainst}
                </Button>
                <Button 
                    variant={userVote?.voteType === 'Neutral' ? 'secondary' : 'outline'} 
                    size="sm" 
                    onClick={() => handleVote('Neutral')} 
                    disabled={!isActive || !currentUserId}
                    className="px-2 py-1 h-auto"
                    aria-label={`Vote Neutral (${voteCountNeutral} votes)`}
                >
                     <Hand className="h-4 w-4 mr-1" /> {voteCountNeutral}
                </Button>
            </div>
         </div>
         <div className="text-sm text-gray-500 w-full pt-1" data-testid="quorum-info">
             {votesCount} of {totalMembers} votes (quorum {proposal.quorumPct}%)
         </div>
         {isActive && proposal.waitingVoters && proposal.waitingVoters.length > 0 && (
            <div className="pt-2 w-full">
                <p className="text-xs text-muted-foreground mb-1">Waiting for:</p>
                <div className="flex flex-wrap -space-x-2">
                    <TooltipProvider delayDuration={100}>
                    {proposal.waitingVoters.map((voter) => (
                         <Tooltip key={voter.id}>
                            <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 border-2 border-background">
                                    <AvatarImage src={voter.avatarUrl ?? undefined} alt={voter.name} />
                                    <AvatarFallback className="text-[10px]">{getInitials(voter.name)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{voter.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                    </TooltipProvider>
                </div>
            </div>
         )}
      </CardFooter>
    </Card>
  );
};

export default ProposalCard; 