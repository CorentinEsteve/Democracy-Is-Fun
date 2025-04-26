import { prisma } from '@/server'; // Import shared prisma instance from server.ts
import { Prisma } from '@prisma/client'; // Import Prisma namespace if needed for types
import { NotFoundError } from '@/utils/errors'; // Assuming you create/import this custom error

/**
 * Find the last N messages for a specific community.
 * @param communityId - The ID of the community.
 * @param limit - The maximum number of messages to retrieve.
 * @returns A promise resolving to an array of messages.
 */
export const findMessagesByCommunity = async (communityId: number, limit: number = 50) => {
    // Basic check if community exists (optional, depends on access control)
    // const community = await prisma.community.findUnique({ where: { id: communityId } });
    // if (!community) {
    //     throw new NotFoundError('Community not found');
    // }

    return prisma.message.findMany({
        where: { communityId },
        orderBy: { createdAt: 'desc' }, 
        take: limit,
        include: { // Include author details
            author: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                },
            },
        },
    });
};

/**
 * Creates a new message in a community.
 * Ensures the community exists before attempting creation.
 * @param communityId - The ID of the community.
 * @param authorId - The ID of the message author.
 * @param content - The message content.
 * @returns A promise resolving to the newly created message.
 * @throws {NotFoundError} If the community does not exist.
 * @throws {Error} If content is empty.
 */
export const createMessage = async (communityId: number, authorId: number, content: string) => {
    if (!content || content.trim().length === 0) {
        throw new Error('Message content cannot be empty');
    }

    // Check if community exists first
    const community = await prisma.community.findUnique({ 
        where: { id: communityId },
        select: { id: true } // Only select id, we just need to know if it exists
    });
    if (!community) {
        throw new NotFoundError('Community not found'); // Throw specific error
    }

     // Optional: Check if user is a member could also go here
    // const membership = await prisma.membership.findUnique({ 
    //     where: { userId_communityId: { userId: authorId, communityId } }
    // });
    // if (!membership) {
    //     throw new NotFoundError('User is not a member of this community');
    // }

    // Proceed with creation only if community exists
    return prisma.message.create({
        data: {
            content: content.trim(), // Trim content before saving
            communityId,
            authorId,
        },
        include: { // Include author details in the response
             author: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                },
            },
        }
    });
}; 