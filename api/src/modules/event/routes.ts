import { Router } from 'express';
import * as eventController from './controllers/eventController';
import { authenticate } from '../../middleware/authenticate';

const communityEventsRouter = Router({ mergeParams: true });
const singleEventRouter = Router();

// GET /communities/:communityId/events
communityEventsRouter.get('/', authenticate, eventController.listEvents);

// GET /events/:id/ics
singleEventRouter.get('/:id/ics', authenticate, eventController.exportIcs);

export { communityEventsRouter, singleEventRouter }; 