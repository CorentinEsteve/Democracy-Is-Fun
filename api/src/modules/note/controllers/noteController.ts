import { Request, Response } from 'express';
import * as noteService from '../services/noteService';
import * as communityService from '../../community/services/communityService';

export const createNote = async (req: Request, res: Response): Promise<void> => {
  const communityId = parseInt(req.params.communityId, 10);
  const userId = req.user?.userId;
  const { content } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (isNaN(communityId)) {
    res.status(400).json({ message: 'Invalid community ID' });
    return;
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ message: 'Note content is required and cannot be empty' });
    return;
  }

  try {
    // Check if user is a member of the community first
    const isMember = await communityService.isUserMember(userId, communityId);
    if (!isMember) {
      res.status(403).json({ message: 'Forbidden: User is not a member of this community' });
      return;
    }

    const note = await noteService.createNote(communityId, userId, content);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Internal server error creating note' });
  }
};

export const listNotes = async (req: Request, res: Response): Promise<void> => {
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

  try {
    // Check if user is a member of the community
    const isMember = await communityService.isUserMember(userId, communityId);
    if (!isMember) {
      const communityExists = await communityService.findCommunityById(communityId);
      if (!communityExists) {
        res.status(404).json({ message: 'Community not found' });
      } else {
        res.status(403).json({ message: 'Forbidden: User is not a member of this community' });
      }
      return;
    }

    const notes = await noteService.findNotesByCommunityId(communityId);
    res.status(200).json(notes);
  } catch (error) {
    console.error('Error listing notes:', error);
    res.status(500).json({ message: 'Internal server error listing notes' });
  }
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
  const noteId = parseInt(req.params.id, 10);
  const userId = req.user?.userId;
  const { content } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (isNaN(noteId)) {
    res.status(400).json({ message: 'Invalid note ID' });
    return;
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ message: 'Note content is required and cannot be empty' });
    return;
  }

  try {
    const note = await noteService.findNoteById(noteId);
    if (!note) {
      res.status(404).json({ message: 'Note not found' });
      return;
    }

    // Check permissions (Author or Community Admin)
    const canModify = await noteService.canUserModifyNote(userId, note);
    if (!canModify) {
      res.status(403).json({ message: 'Forbidden: User cannot modify this note' });
      return;
    }

    const updatedNote = await noteService.updateNoteContent(noteId, content);
    res.status(200).json(updatedNote);

  } catch (error: any) {
    console.error('Error updating note:', error);
    if ((error as any).code === 'P2025') {
        res.status(404).json({ message: 'Note not found' });
    } else {
        res.status(500).json({ message: 'Internal server error updating note' });
    }
  }
};

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  const noteId = parseInt(req.params.id, 10);
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (isNaN(noteId)) {
    res.status(400).json({ message: 'Invalid note ID' });
    return;
  }

  try {
    const note = await noteService.findNoteById(noteId);
    if (!note) {
      res.status(404).json({ message: 'Note not found' });
      return;
    }

    // Check permissions (Author or Community Admin)
    const canDelete = await noteService.canUserModifyNote(userId, note); // Same permission logic for delete
    if (!canDelete) {
      res.status(403).json({ message: 'Forbidden: User cannot delete this note' });
      return;
    }

    await noteService.deleteNoteById(noteId);
    res.status(204).send();

  } catch (error: any) {
    console.error('Error deleting note:', error);
     if ((error as any).code === 'P2025') {
        res.status(404).json({ message: 'Note not found' });
    } else {
        res.status(500).json({ message: 'Internal server error deleting note' });
    }
  }
}; 