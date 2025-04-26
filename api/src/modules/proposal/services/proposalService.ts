import { Prisma, Proposal, Vote, User, Membership } from '@prisma/client';
import { prisma } from '../../../server'; // Adjust path if necessary

// Define interfaces for clarity
interface ProposalCreateInput {
  title: string;
  description?: string;
  location?: string;
  dateTime?: Date;
  tags: string[]; // Expect array, will store as JSON string
  deadline: Date;
  quorumPct?: number;
  communityId: number;
  initiatorId: number;
  parentProposalId?: number;
}

interface VoteInput {
  voteType: 'For' | 'Against' | 'Neutral'; // Use allowed string values
  proposalId: number;
  voterId: number;
}

// Define the enriched type for API responses
// Omit the original 'tags' string and add the parsed array, plus computed fields
type EnrichedProposal = Omit<Proposal, 'tags'> & {
    tags: string[];
    votes: Vote[]; // Always include votes when enriching
    voteCounts: { For: number; Against: number; Neutral: number };
    waitingVoters: Pick<User, 'id' | 'name' | 'avatarUrl'>[];
    initiator?: Pick<User, 'id' | 'name' | 'avatarUrl'>; // Make initiator optional here
    parentProposal?: Proposal | null; // Include parent if fetched
};

// Helper to stringify tags
const stringifyTags = (tags: string[]): string => JSON.stringify(tags);
// Helper to parse tags (handle potential errors)
const parseTags = (tagsString: string): string[] => {
  try {
    const tags = JSON.parse(tagsString);
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.error('Error parsing tags JSON:', error);
    return []; // Return empty array on error
  }
};

// Add vote counts and waiting voters to a proposal
// Type annotation adjusted to return the new EnrichedProposal structure
const enrichProposal = async (
    proposal: Proposal & { 
        votes: Vote[], 
        initiator?: Pick<User, 'id' | 'name' | 'avatarUrl'>, 
        parentProposal?: Proposal | null 
    },
    communityId: number
): Promise<EnrichedProposal> => {
  const votes = proposal.votes;
  const voteCounts = {
    For: votes.filter(v => v.voteType === 'For').length,
    Against: votes.filter(v => v.voteType === 'Against').length,
    Neutral: votes.filter(v => v.voteType === 'Neutral').length,
  };
  const voters = votes.map(v => v.voterId);

  const communityMembers = await prisma.membership.findMany({
    where: { communityId },
    select: { userId: true, user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const waitingVoters = communityMembers
    .filter(m => !voters.includes(m.userId))
    .map(m => m.user); // Return simplified user info

  // Parse tags string back into array for the response
  const parsedTags = parseTags(proposal.tags);

  // Exclude the original tags string before spreading
  const { tags: _, ...rest } = proposal;

  return {
    ...rest,
    tags: parsedTags,
    voteCounts,
    waitingVoters,
    // initiator and parentProposal are already included if they were passed in
  };
};

// Updated return type
export const createProposalAndVote = async (data: ProposalCreateInput): Promise<EnrichedProposal> => {
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.proposal.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        dateTime: data.dateTime,
        tags: stringifyTags(data.tags), // Store tags as JSON string
        deadline: data.deadline,
        quorumPct: data.quorumPct,
        status: 'Active',
        communityId: data.communityId,
        initiatorId: data.initiatorId,
        parentProposalId: data.parentProposalId,
      },
    });

    // Auto-vote 'For' by initiator
    await tx.vote.create({
      data: {
        proposalId: proposal.id,
        voterId: data.initiatorId,
        voteType: 'For',
      },
    });

    // Fetch the proposal again to include the vote implicitly created
    const newProposalWithVote = await tx.proposal.findUniqueOrThrow({
      where: { id: proposal.id },
      include: { votes: true, initiator: { select: { id: true, name: true, avatarUrl: true } } }, // Include votes and initiator
    });

    // Enrich the newly created proposal
    return enrichProposal(newProposalWithVote, newProposalWithVote.communityId);
  });
};

// Updated return type
export const findProposalsByCommunity = async (
  communityId: number,
  statusFilter: string | undefined
): Promise<EnrichedProposal[]> => {

  const whereClause: Prisma.ProposalWhereInput = { communityId };

  if (statusFilter && ['Active', 'Approved', 'Rejected'].includes(statusFilter)) {
    whereClause.status = statusFilter;
  }

  const proposals = await prisma.proposal.findMany({
    where: whereClause,
    include: {
        votes: true, // Include votes for counting
        initiator: { select: { id: true, name: true, avatarUrl: true } } // Include initiator details
    },
    orderBy: {
        createdAt: 'desc'
    }
  });

  // Enrich each proposal with vote counts and waiting voters
  const enrichedProposals = await Promise.all(
    proposals.map(p => enrichProposal(p, communityId))
  );

  return enrichedProposals;
};

// Updated return type
export const findProposalById = async (
  proposalId: number
): Promise<EnrichedProposal | null> => {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      votes: true,
      parentProposal: true, // Include parent proposal for revision tracking
      initiator: { select: { id: true, name: true, avatarUrl: true } } // Include initiator
    },
  });

  if (proposal) {
    // Enrich the found proposal
    return enrichProposal(proposal, proposal.communityId);
  }
  return null;
};

// Updated return type
export const recordOrUpdateVote = async (
  voteData: VoteInput
): Promise<{ proposal: EnrichedProposal, voteCounts: { For: number, Against: number, Neutral: number } }> => {

   let proposalToCheck = await prisma.proposal.findUniqueOrThrow({ where: { id: voteData.proposalId }});

   // Prevent voting on non-active proposals
   if (proposalToCheck.status !== 'Active') {
    throw new Error(`Proposal ${proposalToCheck.id} is not active for voting.`);
   }
   // Prevent voting after deadline
   if (new Date() > proposalToCheck.deadline) {
       // Optional: Could automatically change status here if deadline passed without resolution
       // For now, just prevent the vote.
       throw new Error(`Voting deadline for proposal ${proposalToCheck.id} has passed.`);
   }

  // Record the vote first
  await prisma.vote.upsert({
    where: {
      proposalId_voterId: {
        proposalId: voteData.proposalId,
        voterId: voteData.voterId,
      },
    },
    update: { voteType: voteData.voteType },
    create: {
      proposalId: voteData.proposalId,
      voterId: voteData.voterId,
      voteType: voteData.voteType,
    },
  });

  // After recording vote, check and potentially update proposal status
  const updatedProposalRaw = await checkAndUpdateProposalStatus(voteData.proposalId);

  // Fetch the fully updated proposal with necessary includes for enrichment
  const finalProposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: updatedProposalRaw.id },
    include: { 
        votes: true, 
        initiator: { select: { id: true, name: true, avatarUrl: true } },
        parentProposal: true 
    }
  });

  // Enrich the final proposal state
  const enrichedFinalProposal = await enrichProposal(finalProposal, finalProposal.communityId);

  return { proposal: enrichedFinalProposal, voteCounts: enrichedFinalProposal.voteCounts };
};

// --- Status Update Logic --- 
// This function still returns the raw Proposal type, as its primary job is DB update
export const checkAndUpdateProposalStatus = async (proposalId: number): Promise<Proposal> => {
    return prisma.$transaction(async (tx) => {
        const proposal = await tx.proposal.findUniqueOrThrow({
            where: { id: proposalId },
            include: { votes: true }
        });

        // Don't re-evaluate if not active
        if (proposal.status !== 'Active') {
            return proposal;
        }

        const communityMemberCount = await tx.membership.count({
            where: { communityId: proposal.communityId },
        });

        if (communityMemberCount === 0) return proposal; // Avoid division by zero

        const votes = proposal.votes;
        const votesFor = votes.filter(v => v.voteType === 'For').length;
        const votesAgainst = votes.filter(v => v.voteType === 'Against').length;
        const votesNeutral = votes.filter(v => v.voteType === 'Neutral').length;
        const totalVotesCast = votesFor + votesAgainst + votesNeutral;

        const participationPct = (totalVotesCast / communityMemberCount) * 100;
        const quorumMet = participationPct >= proposal.quorumPct;
        const deadlineReached = new Date() >= proposal.deadline;

        let newStatus = proposal.status; // Default to current status

        // 1. Check for Early Close (Insurmountable Majority)
        const remainingVotes = communityMemberCount - totalVotesCast;
        if (votesFor > votesAgainst + remainingVotes + votesNeutral) { // Votes For cannot be beaten
            newStatus = 'Approved';
        } else if (votesAgainst > votesFor + remainingVotes + votesNeutral) { // Votes Against cannot be beaten
            newStatus = 'Rejected';
        }

        // 2. If not early closed, check for Deadline Reached conditions
        if (newStatus === 'Active' && deadlineReached) {
            if (quorumMet) {
                if (votesFor > votesAgainst) {
                    newStatus = 'Approved';
                } else if (votesAgainst > votesFor) {
                    newStatus = 'Rejected';
                } else {
                    // Tie at deadline with quorum: remains Active per spec (or could be Rejected/Archived)
                    newStatus = 'Active'; // Explicitly keep active on tie
                }
            } else {
                // Quorum not met by deadline
                newStatus = 'Rejected'; // Or move to an 'Expired' / 'Archived' status
            }
        }

        // 3. Update status in DB if changed
        if (newStatus !== proposal.status) {
            const updatedProposal = await tx.proposal.update({
                where: { id: proposalId },
                data: { status: newStatus },
            });

            // --- Add Event Creation --- 
            if (newStatus === 'Approved' && updatedProposal.dateTime) { // Only create event if approved AND has dateTime
                await tx.event.create({
                    data: {
                        title: updatedProposal.title,
                        dateTime: updatedProposal.dateTime, // Use proposal dateTime
                        location: updatedProposal.location,
                        proposalId: updatedProposal.id,
                        communityId: updatedProposal.communityId,
                    }
                });
                // TODO: Award points (requires Membership update in transaction)
                // Example: await tx.membership.update({ where: { userId_communityId: { userId: updatedProposal.initiatorId, communityId: updatedProposal.communityId } }, data: { points: { increment: 10 } } });
            }
             // --- End Add Event Creation --- 

            return updatedProposal;
        } else {
            return proposal; // Return original proposal if status didn't change
        }
    });
};
 