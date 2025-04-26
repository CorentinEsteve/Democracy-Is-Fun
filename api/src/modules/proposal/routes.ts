import { Router } from 'express';
import * as proposalController from './controllers/proposalController';
import { authenticate } from '../../middleware/authenticate';

const router = Router({ mergeParams: true }); // Enable params from parent router (like communityId)

// --- Routes specific to a community --- 
// POST /communities/:communityId/proposals
router.post('/', authenticate, proposalController.createProposal);

// GET /communities/:communityId/proposals?status=...
router.get('/', authenticate, proposalController.listProposals);

// --- Routes specific to a proposal (community context implied) --- 
// Create a separate router for these to avoid parameter conflicts or complex pathing
const proposalSpecificRouter = Router();

// GET /proposals/:id
proposalSpecificRouter.get('/:id', authenticate, proposalController.getProposal);

// POST /proposals/:id/vote
proposalSpecificRouter.post('/:id/vote', authenticate, proposalController.voteOnProposal);

// Export both routers or combine them as needed in server.ts
export { router as communityProposalsRouter, proposalSpecificRouter }; 