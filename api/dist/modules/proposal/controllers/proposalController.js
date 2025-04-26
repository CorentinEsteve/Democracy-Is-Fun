"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteOnProposal = exports.getProposal = exports.listProposals = exports.createProposal = void 0;
const proposalService = __importStar(require("../services/proposalService"));
const communityService = __importStar(require("../../community/services/communityService"));
// Helper function to validate voteType string
const isValidVoteType = (voteType) => {
    return ['For', 'Against', 'Neutral'].includes(voteType);
};
const createProposal = async (req, res) => {
    const { title, description, location, dateTime, tags, deadline, quorumPct, parentProposalId } = req.body;
    const communityId = parseInt(req.params.communityId, 10);
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    if (isNaN(communityId)) {
        res.status(400).json({ message: 'Invalid community ID' });
        return;
    }
    if (!title || !deadline) {
        res.status(400).json({ message: 'Title and deadline are required' });
        return;
    }
    // Validate data types
    let parsedDeadline;
    let parsedDateTime = undefined;
    let parsedQuorum = quorumPct ? parseInt(quorumPct, 10) : undefined;
    let parsedTags = [];
    try {
        parsedDeadline = new Date(deadline);
        if (isNaN(parsedDeadline.getTime()))
            throw new Error('Invalid deadline date format');
        if (dateTime) {
            parsedDateTime = new Date(dateTime);
            if (isNaN(parsedDateTime.getTime()))
                throw new Error('Invalid dateTime date format');
        }
        if (tags && Array.isArray(tags)) {
            parsedTags = tags.filter(t => typeof t === 'string'); // Ensure tags are strings
        }
        else if (tags) {
            // Attempt to parse if provided as a JSON string (flexible input)
            try {
                const maybeTags = JSON.parse(tags);
                if (Array.isArray(maybeTags)) {
                    parsedTags = maybeTags.filter(t => typeof t === 'string');
                }
            }
            catch (e) {
                console.warn('Could not parse tags as JSON, expecting array:', tags);
                // Keep parsedTags as []
            }
        }
        if (parsedQuorum !== undefined && (isNaN(parsedQuorum) || parsedQuorum < 0 || parsedQuorum > 100)) {
            throw new Error('Quorum percentage must be between 0 and 100');
        }
    }
    catch (error) {
        res.status(400).json({ message: `Invalid input data: ${error.message}` });
        return;
    }
    try {
        // Check if user is a member of the community
        const isMember = await communityService.isUserMember(userId, communityId);
        if (!isMember) {
            res.status(403).json({ message: 'Forbidden: User is not a member of this community' });
            return;
        }
        const proposalData = {
            title,
            description,
            location,
            dateTime: parsedDateTime,
            tags: parsedTags, // Pass the validated array
            deadline: parsedDeadline,
            quorumPct: parsedQuorum, // Use parsed value or default will apply in service
            communityId,
            initiatorId: userId,
            parentProposalId: parentProposalId ? parseInt(parentProposalId, 10) : undefined,
        };
        const proposal = await proposalService.createProposalAndVote(proposalData);
        res.status(201).json(proposal);
    }
    catch (error) {
        console.error('Error creating proposal:', error);
        // Handle potential Prisma errors like unique constraints if needed
        res.status(500).json({ message: `Internal server error creating proposal: ${error.message}` });
    }
};
exports.createProposal = createProposal;
const listProposals = async (req, res) => {
    const communityId = parseInt(req.params.communityId, 10);
    const userId = req.user?.userId;
    const status = req.query.status;
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    if (isNaN(communityId)) {
        res.status(400).json({ message: 'Invalid community ID' });
        return;
    }
    try {
        // Check if user is a member of the community
        const isMember = await communityService.isUserMember(userId, communityId);
        if (!isMember) {
            // Check if community exists before returning 403 vs 404
            const communityExists = await communityService.findCommunityById(communityId);
            if (!communityExists) {
                res.status(404).json({ message: 'Community not found' });
            }
            else {
                res.status(403).json({ message: 'Forbidden: User is not a member of this community' });
            }
            return;
        }
        const proposals = await proposalService.findProposalsByCommunity(communityId, status);
        res.status(200).json(proposals);
    }
    catch (error) {
        console.error('Error listing proposals:', error);
        res.status(500).json({ message: 'Internal server error listing proposals' });
    }
};
exports.listProposals = listProposals;
const getProposal = async (req, res) => {
    const proposalId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    if (isNaN(proposalId)) {
        res.status(400).json({ message: 'Invalid proposal ID' });
        return;
    }
    try {
        const proposal = await proposalService.findProposalById(proposalId);
        if (!proposal) {
            res.status(404).json({ message: 'Proposal not found' });
            return;
        }
        // Check if user is a member of the proposal's community
        const isMember = await communityService.isUserMember(userId, proposal.communityId);
        if (!isMember) {
            // Technically shouldn't happen if routing is correct, but good safeguard
            res.status(403).json({ message: 'Forbidden: User is not a member of the proposal\'s community' });
            return;
        }
        res.status(200).json(proposal);
    }
    catch (error) {
        console.error('Error getting proposal:', error);
        res.status(500).json({ message: 'Internal server error getting proposal' });
    }
};
exports.getProposal = getProposal;
const voteOnProposal = async (req, res) => {
    const proposalId = parseInt(req.params.id, 10);
    const userId = req.user?.userId;
    const { voteType } = req.body;
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    if (isNaN(proposalId)) {
        res.status(400).json({ message: 'Invalid proposal ID' });
        return;
    }
    if (!isValidVoteType(voteType)) {
        res.status(400).json({ message: 'Invalid voteType. Must be For, Against, or Neutral.' });
        return;
    }
    try {
        const proposal = await proposalService.findProposalById(proposalId);
        if (!proposal) {
            res.status(404).json({ message: 'Proposal not found' });
            return;
        }
        // Check if user is a member of the proposal's community
        const isMember = await communityService.isUserMember(userId, proposal.communityId);
        if (!isMember) {
            res.status(403).json({ message: 'Forbidden: User is not a member of this community' });
            return;
        }
        const result = await proposalService.recordOrUpdateVote({ proposalId, voterId: userId, voteType });
        res.status(200).json(result); // Contains updated proposal status and vote counts
    }
    catch (error) {
        // Only log unexpected errors
        if (error.message.includes('not active for voting') || error.message.includes('deadline for proposal')) {
            res.status(403).json({ message: error.message });
        }
        else if (error.code === 'P2025') { // Handle Prisma Not Found during update/upsert if needed
            res.status(404).json({ message: 'Proposal or User not found during vote process.' });
        }
        else {
            // Log other, unexpected errors
            console.error('Error voting on proposal:', error);
            res.status(500).json({ message: `Internal server error voting on proposal: ${error.message}` });
        }
    }
};
exports.voteOnProposal = voteOnProposal;
//# sourceMappingURL=proposalController.js.map