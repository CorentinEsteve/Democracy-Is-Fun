import React from 'react';
import { format, formatDistanceToNowStrict, parseISO, isPast } from 'date-fns';
import { ThumbsUp, ThumbsDown, Hand, CalendarDays, MapPin } from 'lucide-react';

import { Proposal, VoteType, PartialUser } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

const tagColorPairs = [
    { bg: 'bg-blue-100', text: 'text-blue-800' },
    { bg: 'bg-green-100', text: 'text-green-800' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    { bg: 'bg-purple-100', text: 'text-purple-800' },
    { bg: 'bg-red-100', text: 'text-red-800' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    { bg: 'bg-pink-100', text: 'text-pink-800' },
    { bg: 'bg-gray-100', text: 'text-gray-800' },
];

const getTagColorClasses = (tag: string): string => {
    const hash = simpleHash(tag);
    const pair = tagColorPairs[hash % tagColorPairs.length];
    return cn(pair.bg, pair.text);
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
    'transition-shadow duration-300 w-full border shadow',
    isActive && !hasVoted && 'shadow-lg shadow-green-500/30',
    isActive && hasVoted && 'shadow-lg shadow-blue-500/30'
  );

  const voteCountFor = getVoteCount('For');
  const voteCountAgainst = getVoteCount('Against');
  const voteCountNeutral = getVoteCount('Neutral');

  const totalMembers = members.length;
  const votesCount = proposal.votes.length;

  return (
    <Card className={cn(cardClasses, "p-4 space-y-3")} data-testid={`proposal-card-${proposal.id}`}>
      <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold leading-tight truncate mr-auto" title={proposal.title}>{proposal.title}</h3>
        <div className="flex items-center space-x-1 text-xs text-muted-foreground flex-shrink-0">
           <Avatar className="h-4 w-4">
                <AvatarImage src={proposal.initiator.avatarUrl ?? undefined} alt={proposal.initiator.name} />
                <AvatarFallback className="text-[8px]">{getInitials(proposal.initiator.name)}</AvatarFallback>
            </Avatar>
           <span className="truncate">{proposal.initiator.name}</span>
           {proposal.dateTime && <span className="pl-1">• {format(parseISO(proposal.dateTime), 'MM/dd/yyyy')}</span>}
        </div>
      </div>

      {/* Combined Tags & Location Line */}
      {(proposal.tags && proposal.tags.length > 0) || proposal.location ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-sm">
           {/* Tags with Colors */}
           {proposal.tags && proposal.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {proposal.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className={cn("px-1.5 py-0.5 text-xs font-medium border-transparent", getTagColorClasses(tag))}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            {/* Location - pushed to the right if tags exist */} 
            {proposal.location && (
              <span className={cn("flex items-center gap-1 text-muted-foreground truncate", proposal.tags && proposal.tags.length > 0 && "ml-auto")}>
                 <MapPin className="h-3 w-3 flex-shrink-0" /> 
                 {proposal.location}
              </span>
            )}
        </div>
      ) : null}

      {/* Description */}
      {proposal.description && (
        <div className="text-sm text-muted-foreground pt-1"> 
             <p className="line-clamp-2">{proposal.description}</p>
        </div>
      )}

      {/* Countdown & Quorum */}
      <div className="flex justify-between items-center text-xs text-muted-foreground pt-2"> {/* Added pt-2 */}
            <div className="flex items-center gap-1" title="Voting Deadline">
                <CalendarDays className="h-3 w-3" /> 
                {isDeadlinePassed ? (
                    <span className="text-red-500 font-medium">Expired</span>
                ) : (
                    <span>
                        {formatDistanceToNowStrict(deadlineDate, { addSuffix: true })}
                    </span>
                )}
            </div>
             {totalMembers > 0 && (
                <div className="flex items-center gap-1" title={`Quorum: ${proposal.quorumPct}% (${votesCount}/${totalMembers} votes)`} data-testid="quorum-info">
                    <span>{votesCount}/{totalMembers} votes ({proposal.quorumPct}%)</span>
                </div>
             )}
         </div>

      {/* Footer: Vote Buttons & Waiting Voters */}
      <div className="flex justify-between items-end pt-2">
         {/* Waiting Voters */}
         {isActive && proposal.waitingVoters && proposal.waitingVoters.length > 0 ? (
            <div className="flex-shrink-0 pr-2">
                <p className="text-xs text-muted-foreground mb-1">Waiting:</p>
                <div className="flex flex-wrap -space-x-2">
                    <TooltipProvider delayDuration={100}>
                    {proposal.waitingVoters.slice(0, 5).map((voter) => ( 
                         <Tooltip key={voter.id}>
                            <TooltipTrigger asChild>
                                <Avatar className="h-5 w-5 border border-background">
                                    <AvatarImage src={voter.avatarUrl ?? undefined} alt={voter.name} />
                                    <AvatarFallback className="text-[9px]">{getInitials(voter.name)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{voter.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                     {proposal.waitingVoters.length > 5 && (
                         <Avatar className="h-5 w-5 border border-background">
                             <AvatarFallback className="text-[9px]">+{proposal.waitingVoters.length - 5}</AvatarFallback>
                         </Avatar>
                     )}
                    </TooltipProvider>
                </div>
            </div>
         ) : <div className="flex-shrink-0 w-12"></div> /* Adjust placeholder width if needed */}

        {/* Vote Buttons */}
        <div className="flex space-x-1 items-center justify-end flex-shrink-0" data-testid="vote-buttons">
            <Button 
                variant={userVote?.voteType === 'For' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleVote('For')} 
                disabled={!isActive || !currentUserId}
                className="px-2 py-1 h-auto text-xs" 
                aria-label={`Vote For (${voteCountFor} votes)`}
            >
                <ThumbsUp className="h-3 w-3 mr-1" /> {voteCountFor}
            </Button>
            <Button 
                variant={userVote?.voteType === 'Against' ? 'destructive' : 'outline'} 
                size="sm" 
                onClick={() => handleVote('Against')} 
                disabled={!isActive || !currentUserId}
                className="px-2 py-1 h-auto text-xs"
                aria-label={`Vote Against (${voteCountAgainst} votes)`}
            >
                <ThumbsDown className="h-3 w-3 mr-1" /> {voteCountAgainst}
            </Button>
            <Button 
                variant={userVote?.voteType === 'Neutral' ? 'secondary' : 'outline'} 
                size="sm" 
                onClick={() => handleVote('Neutral')} 
                disabled={!isActive || !currentUserId}
                className="px-2 py-1 h-auto text-xs"
                aria-label={`Vote Neutral (${voteCountNeutral} votes)`}
            >
                 <Hand className="h-3 w-3 mr-1" /> {voteCountNeutral}
            </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProposalCard; 