"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndUpdateProposalStatus = exports.recordOrUpdateVote = exports.findProposalById = exports.findProposalsByCommunity = exports.createProposalAndVote = void 0;
const server_1 = require("../../../server"); // Adjust path if necessary
// Helper to stringify tags
const stringifyTags = (tags) => JSON.stringify(tags);
// Helper to parse tags (handle potential errors)
const parseTags = (tagsString) => {
    try {
        const tags = JSON.parse(tagsString);
        return Array.isArray(tags) ? tags : [];
    }
    catch (error) {
        console.error('Error parsing tags JSON:', error);
        return []; // Return empty array on error
    }
};
// Add vote counts and waiting voters to a proposal
// Type annotation adjusted to return the new EnrichedProposal structure
const enrichProposal = async (proposal, communityId) => {
    const votes = proposal.votes;
    const voteCounts = {
        For: votes.filter(v => v.voteType === 'For').length,
        Against: votes.filter(v => v.voteType === 'Against').length,
        Neutral: votes.filter(v => v.voteType === 'Neutral').length,
    };
    const voters = votes.map(v => v.voterId);
    const communityMembers = await server_1.prisma.membership.findMany({
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
const createProposalAndVote = async (data) => {
    return server_1.prisma.$transaction(async (tx) => {
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
exports.createProposalAndVote = createProposalAndVote;
// Updated return type
const findProposalsByCommunity = async (communityId, statusFilter) => {
    const whereClause = { communityId };
    if (statusFilter && ['Active', 'Approved', 'Rejected'].includes(statusFilter)) {
        whereClause.status = statusFilter;
    }
    const proposals = await server_1.prisma.proposal.findMany({
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
    const enrichedProposals = await Promise.all(proposals.map(p => enrichProposal(p, communityId)));
    return enrichedProposals;
};
exports.findProposalsByCommunity = findProposalsByCommunity;
// Updated return type
const findProposalById = async (proposalId) => {
    const proposal = await server_1.prisma.proposal.findUnique({
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
exports.findProposalById = findProposalById;
// Updated return type
const recordOrUpdateVote = async (voteData) => {
    let proposalToCheck = await server_1.prisma.proposal.findUniqueOrThrow({ where: { id: voteData.proposalId } });
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
    await server_1.prisma.vote.upsert({
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
    const updatedProposalRaw = await (0, exports.checkAndUpdateProposalStatus)(voteData.proposalId);
    // Fetch the fully updated proposal with necessary includes for enrichment
    const finalProposal = await server_1.prisma.proposal.findUniqueOrThrow({
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
exports.recordOrUpdateVote = recordOrUpdateVote;
// --- Status Update Logic --- 
// This function still returns the raw Proposal type, as its primary job is DB update
const checkAndUpdateProposalStatus = async (proposalId) => {
    const proposal = await server_1.prisma.proposal.findUniqueOrThrow({
        where: { id: proposalId },
        include: { votes: true }
    });
    // Don't re-evaluate if not active
    if (proposal.status !== 'Active') {
        return proposal;
    }
    const communityMemberCount = await server_1.prisma.membership.count({
        where: { communityId: proposal.communityId },
    });
    if (communityMemberCount === 0)
        return proposal; // Avoid division by zero
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
    }
    else if (votesAgainst > votesFor + remainingVotes + votesNeutral) { // Votes Against cannot be beaten
        newStatus = 'Rejected';
    }
    // 2. If not early closed, check for Deadline Reached conditions
    if (newStatus === 'Active' && deadlineReached) {
        if (quorumMet) {
            if (votesFor > votesAgainst) {
                newStatus = 'Approved';
            }
            else if (votesAgainst > votesFor) {
                newStatus = 'Rejected';
            }
            else {
                // Tie at deadline with quorum: remains Active per spec (or could be Rejected/Archived)
                newStatus = 'Active'; // Explicitly keep active on tie
            }
        }
        else {
            // Quorum not met by deadline
            newStatus = 'Rejected'; // Or move to an 'Expired' / 'Archived' status
        }
    }
    // 3. Update status in DB if changed
    if (newStatus !== proposal.status) {
        const updatedProposal = await server_1.prisma.proposal.update({
            where: { id: proposalId },
            data: { status: newStatus },
        });
        // TODO: If Approved, create Event (requires Event module/service)
        // TODO: If Approved, award points (requires Membership update)
        return updatedProposal;
    }
    else {
        return proposal; // Return original proposal if status didn't change
    }
};
exports.checkAndUpdateProposalStatus = checkAndUpdateProposalStatus;
//# sourceMappingURL=proposalService.js.map