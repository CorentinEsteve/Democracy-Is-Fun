import React, { useState, useEffect } from 'react';
import { formatDistanceToNow, parseISO, isPast } from 'date-fns';
import { ThumbsUp, ThumbsDown, Hand } from 'lucide-react';

import { Proposal, VoteType, PartialUser, Vote } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

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

const Countdown = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const deadlineDate = parseISO(deadline);
      if (isPast(deadlineDate)) {
        setTimeLeft('Closed');
      } else {
        setTimeLeft(formatDistanceToNow(deadlineDate, { addSuffix: true }));
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  return <span className="text-sm text-muted-foreground">{timeLeft}</span>;
};

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onVote, currentUserId }) => {
  const userVote = proposal.votes.find((v) => v.voterId === currentUserId);
  const hasVoted = !!userVote;
  const isDeadlinePassed = isPast(parseISO(proposal.deadline));
  const isActive = proposal.status === 'Active' && !isDeadlinePassed;

  const getVoteCount = (type: VoteType) => proposal.votes.filter(v => v.voteType === type).length;

  const handleVote = (voteType: VoteType) => {
    if (!currentUserId || !isActive || hasVoted) return; // Prevent voting if not logged in, inactive, or already voted
    onVote(proposal.id, voteType);
  };

  const cardClasses = cn(
    'transition-shadow duration-300', // Base transition
    !isDeadlinePassed && proposal.status === 'Active' && !hasVoted && 'shadow-lg shadow-green-500/30', // Green glow for not voted
    !isDeadlinePassed && proposal.status === 'Active' && hasVoted && 'shadow-lg shadow-blue-500/30' // Blue glow for voted
  );

  const voteCountFor = getVoteCount('For');
  const voteCountAgainst = getVoteCount('Against');
  const voteCountNeutral = getVoteCount('Neutral');

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
            <Countdown deadline={proposal.deadline} />
            <div className="flex space-x-1" data-testid="vote-buttons">
                <Button 
                    variant={userVote?.voteType === 'For' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => handleVote('For')} 
                    disabled={!isActive || hasVoted || !currentUserId}
                    className="px-2 py-1 h-auto"
                    aria-label={`Vote For (${voteCountFor} votes)`}
                >
                    <ThumbsUp className="h-4 w-4 mr-1" /> {voteCountFor}
                </Button>
                <Button 
                    variant={userVote?.voteType === 'Against' ? 'destructive' : 'outline'} 
                    size="sm" 
                    onClick={() => handleVote('Against')} 
                    disabled={!isActive || hasVoted || !currentUserId}
                    className="px-2 py-1 h-auto"
                    aria-label={`Vote Against (${voteCountAgainst} votes)`}
                >
                    <ThumbsDown className="h-4 w-4 mr-1" /> {voteCountAgainst}
                </Button>
                <Button 
                    variant={userVote?.voteType === 'Neutral' ? 'secondary' : 'outline'} 
                    size="sm" 
                    onClick={() => handleVote('Neutral')} 
                    disabled={!isActive || hasVoted || !currentUserId}
                    className="px-2 py-1 h-auto"
                    aria-label={`Vote Neutral (${voteCountNeutral} votes)`}
                >
                     <Hand className="h-4 w-4 mr-1" /> {voteCountNeutral}
                </Button>
            </div>
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