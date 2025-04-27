import { Router } from 'express';
import * as communityController from './controllers/communityController';
import { authenticate } from '../../middleware/authenticate'; // Import middleware
import { authorizeAdmin } from '../../middleware/authorizeAdmin'; // Import admin auth middleware

const router = Router();

// Community Level Routes (require auth)
router.post('/', authenticate, communityController.createCommunity);
router.get('/', authenticate, communityController.listCommunities);

// Specific Community Routes (require auth, sometimes admin)
router.get('/:communityId', authenticate, communityController.getCommunity);
router.patch('/:communityId', authenticate, authorizeAdmin, communityController.updateCommunity);
router.delete('/:communityId', authenticate, authorizeAdmin, communityController.deleteCommunity);

// Membership Routes within a Community
router.get('/:communityId/members', authenticate, communityController.listMembers);
router.post('/:communityId/members', authenticate, authorizeAdmin, communityController.addMember);
router.delete('/:communityId/members/:userId', authenticate, authorizeAdmin, communityController.removeMember);
router.patch('/:communityId/members/:userId', authenticate, authorizeAdmin, communityController.updateMemberRole);

export default router; 