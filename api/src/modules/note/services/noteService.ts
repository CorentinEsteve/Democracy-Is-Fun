import { Prisma, Note, User } from '@prisma/client';
import { prisma } from '../../../server'; // Adjust path if necessary
import { isUserAdmin } from '../../community/services/communityService'; // Reuse permission check

export interface NoteWithAuthor extends Note {
    author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export const createNote = async (
  communityId: number,
  authorId: number,
  content: string
): Promise<NoteWithAuthor> => {
  return prisma.note.create({
    data: {
      communityId,
      authorId,
      content,
    },
    include: {
        author: { // Include author details in the response
            select: { id: true, name: true, avatarUrl: true }
        }
    }
  });
};

export const findNotesByCommunityId = async (communityId: number): Promise<NoteWithAuthor[]> => {
  return prisma.note.findMany({
    where: { communityId },
    include: {
        author: { // Include author details
            select: { id: true, name: true, avatarUrl: true }
        }
    },
    orderBy: {
      timestamp: 'desc', // Order by timestamp descending
    },
  });
};

export const findNoteById = async (noteId: number): Promise<NoteWithAuthor | null> => {
    return prisma.note.findUnique({
        where: { id: noteId },
        include: {
            author: {
                select: { id: true, name: true, avatarUrl: true }
            }
        }
    });
}

export const canUserModifyNote = async (userId: number, note: Note): Promise<boolean> => {
    // Check if user is the author
    if (note.authorId === userId) {
        return true;
    }
    // Check if user is an admin of the note's community
    return isUserAdmin(userId, note.communityId);
}

export const updateNoteContent = async (noteId: number, content: string): Promise<NoteWithAuthor> => {
  return prisma.note.update({
    where: { id: noteId },
    data: { content },
     include: {
        author: {
            select: { id: true, name: true, avatarUrl: true }
        }
    }
  });
};

export const deleteNoteById = async (noteId: number): Promise<void> => {
  await prisma.note.delete({
    where: { id: noteId },
  });
}; 