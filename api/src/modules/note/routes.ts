import { Router } from 'express';
import * as noteController from './controllers/noteController';
import { authenticate } from '../../middleware/authenticate';

const communityNotesRouter = Router({ mergeParams: true }); // Needs communityId from parent
const singleNoteRouter = Router();

// POST /communities/:communityId/notes
communityNotesRouter.post('/', authenticate, noteController.createNote);

// GET /communities/:communityId/notes
communityNotesRouter.get('/', authenticate, noteController.listNotes);

// PATCH /notes/:id
singleNoteRouter.patch('/:id', authenticate, noteController.updateNote);

// DELETE /notes/:id
singleNoteRouter.delete('/:id', authenticate, noteController.deleteNote);

export { communityNotesRouter, singleNoteRouter }; 