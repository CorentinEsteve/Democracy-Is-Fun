import { Request, Response } from 'express';
import * as chatService from '../services/chatService';
// Use standard Request type; Express.Request is extended via declaration merging in authenticate.ts
import { NotFoundError } from '@/utils/errors'; // Assuming this exists

/**
 * List messages for a specific community.
 */
export const listMessages = async (req: Request, res: Response): Promise<void> => {
    const { communityId } = req.params;
    const userId = req.user?.userId; // Corrected: access userId from req.user

    if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User ID missing.' });
        return;
    }

    const communityIdNum = parseInt(communityId, 10);
    if (isNaN(communityIdNum)) {
        res.status(400).json({ message: 'Invalid community ID.' });
        return;
    }

    try {
        // Optional: Add a service layer check to ensure user is part of the community
        // await chatService.ensureUserInCommunity(userId, communityIdNum);

        const messages = await chatService.findMessagesByCommunity(communityIdNum);
        res.status(200).json(messages);
    } catch (error: any) {
        console.error('Error listing messages:', error);
        // Simplified error handling without specific NotFoundError check
        res.status(500).json({ message: 'Failed to retrieve messages.' });
    }
};

/**
 * Create a new message in a community.
 */
export const createMessage = async (req: Request, res: Response): Promise<void> => {
    const { communityId } = req.params;
    const { content } = req.body;
    const authorId = req.user?.userId; // Corrected: access userId from req.user

    if (!authorId) {
        res.status(401).json({ message: 'Unauthorized: User ID missing.' });
        return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        res.status(400).json({ message: 'Message content is required and must be a non-empty string.' });
        return;
    }

    const communityIdNum = parseInt(communityId, 10);
    if (isNaN(communityIdNum)) {
        res.status(400).json({ message: 'Invalid community ID.' });
        return;
    }

    try {
        const newMessage = await chatService.createMessage(communityIdNum, authorId, content);
        // TODO: Implement broadcasting the message via WebSockets here if using real-time
        res.status(201).json(newMessage);
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            // Don't log expected NotFoundError, just send response
            res.status(404).json({ message: error.message });
        } else if (error.message === 'Message content cannot be empty') {
            // Don't log expected validation error, just send response
            res.status(400).json({ message: error.message });
        } else {
            // Log other unexpected errors
            console.error('Unexpected error creating message:', error);
            res.status(500).json({ message: 'Failed to create message.' });
        }
    }
}; 