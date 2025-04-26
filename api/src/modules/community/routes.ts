import { Router } from 'express';
import * as communityController from './controllers/communityController';
import { authenticate } from '../../middleware/authenticate'; // Import middleware

const router = Router();

// Apply authenticate middleware to all community routes
router.use(authenticate);

router.post('/', communityController.createCommunity);
router.get('/', communityController.listCommunities);
router.get('/:id', communityController.getCommunity);
router.patch('/:id', communityController.updateCommunity);
router.delete('/:id', communityController.deleteCommunity);

export default router; 