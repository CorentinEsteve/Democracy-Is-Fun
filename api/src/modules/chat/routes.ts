import { Router } from 'express';
import { listMessages, createMessage } from './controllers/chatController';
import { authenticate } from '@/middleware/authenticate'; // Corrected path

const router = Router();

/**
 * @swagger
 * /communities/{communityId}/messages:
 *   get:
 *     summary: List the last 50 messages for a community
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the community
 *     responses:
 *       200:
 *         description: A list of messages.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: 
 *                 $ref: '#/components/schemas/Message' # Assuming you define this schema elsewhere
 *       401: 
 *         description: Unauthorized
 *       404: 
 *         description: Community not found or user not a member
 *       500:
 *         description: Server error
 */
router.get('/communities/:communityId/messages', authenticate, listMessages);

/**
 * @swagger
 * /communities/{communityId}/messages:
 *   post:
 *     summary: Post a new message to a community
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the community
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: The message content.
 *     responses:
 *       201:
 *         description: Message created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid input (e.g., missing content)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found or user not a member
 *       500:
 *         description: Server error
 */
router.post('/communities/:communityId/messages', authenticate, createMessage);

export default router; 