import request from 'supertest';
import { app } from '../server'; // Import app only
import { User, Community, Membership, Note, PrismaClient } from '@prisma/client'; // Import PrismaClient
import { RoleType } from '../types';
import jwt from 'jsonwebtoken';

// Mock the Prisma client module
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    note: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    community: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(), // Mock disconnect if needed
  };
  return {
    // Return a mock constructor that returns our instance
    PrismaClient: jest.fn(() => mockPrismaClient),
    // Re-export any other types/enums needed by the test file itself
    // (User, Community, Membership, Note are implicitly re-exported by jest.mock)
  };
});

// Mock the authenticate middleware
jest.mock('../middleware/authenticate', () => ({
    authenticate: (req: any, res: any, next: () => void) => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as { userId: number; email: string };
                req.user = { userId: decoded.userId, email: decoded.email };
            } catch (error) {
                // Ignore invalid token
            }
        }
        next();
    },
}));

// Instantiate the mocked client *once* for use in tests
const mockPrisma = new PrismaClient();

// Helper to generate JWT for tests
const generateTestToken = (userId: number, email: string = 'test@example.com'): string => {
    return jwt.sign({ userId, email }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Note API Endpoints', () => {
    let testUser: User;
    let testAdmin: User;
    let otherUser: User;
    let testCommunity: Community;
    let userMembership: Membership;
    let adminMembership: Membership;
    let testNote: Note & { author: Pick<User, 'id' | 'name' | 'avatarUrl'> };
    let adminNote: Note & { author: Pick<User, 'id' | 'name' | 'avatarUrl'> };
    let userToken: string;
    let adminToken: string;
    let otherUserToken: string;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Setup test data
        testUser = { id: 1, email: 'member@example.com', name: 'Test Member', passwordHash: 'hash', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
        testAdmin = { id: 2, email: 'admin@example.com', name: 'Test Admin', passwordHash: 'hash', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
        otherUser = { id: 3, email: 'other@example.com', name: 'Other User', passwordHash: 'hash', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
        testCommunity = { id: 101, name: 'Test Community', description: 'A community for testing', imageUrl: null, creatorId: testAdmin.id, createdAt: new Date(), updatedAt: new Date() };
        userMembership = { userId: testUser.id, communityId: testCommunity.id, role: 'Member', points: 0, joinedAt: new Date() };
        adminMembership = { userId: testAdmin.id, communityId: testCommunity.id, role: 'Admin', points: 0, joinedAt: new Date() };
        testNote = { id: 1001, communityId: testCommunity.id, authorId: testUser.id, content: 'Test note content', timestamp: new Date(), author: { id: testUser.id, name: testUser.name, avatarUrl: testUser.avatarUrl } };
        adminNote = { id: 1002, communityId: testCommunity.id, authorId: testAdmin.id, content: 'Admin note content', timestamp: new Date(), author: { id: testAdmin.id, name: testAdmin.name, avatarUrl: testAdmin.avatarUrl } };

        userToken = generateTestToken(testUser.id, testUser.email);
        adminToken = generateTestToken(testAdmin.id, testAdmin.email);
        otherUserToken = generateTestToken(otherUser.id, otherUser.email);

        // Mock Prisma responses using the mockPrisma instance
        (mockPrisma.membership.findUnique as jest.Mock)
            .mockImplementation(async ({ where: { userId_communityId } }) => {
                if (userId_communityId.userId === testUser.id && userId_communityId.communityId === testCommunity.id) return userMembership;
                if (userId_communityId.userId === testAdmin.id && userId_communityId.communityId === testCommunity.id) return adminMembership;
                return null;
            });

        (mockPrisma.community.findUnique as jest.Mock)
            .mockImplementation(async ({ where: { id } }) => {
                if (id === testCommunity.id) return testCommunity;
                return null;
            });
        (mockPrisma.note.findUnique as jest.Mock)
             .mockImplementation(async ({ where: { id } }) => {
                if (id === testNote.id) return testNote;
                if (id === adminNote.id) return adminNote;
                return null;
            });
    });

    // --- POST /communities/:communityId/notes ---
    describe('POST /communities/:communityId/notes', () => {
        const noteData = { content: 'New test note' };

        it('should create a note successfully for a community member', async () => {
            (mockPrisma.note.create as jest.Mock).mockResolvedValue({
                ...noteData,
                id: 1003,
                communityId: testCommunity.id,
                authorId: testUser.id,
                timestamp: new Date(),
                author: { id: testUser.id, name: testUser.name, avatarUrl: testUser.avatarUrl }
            });

            const response = await request(app)
                .post(`/communities/${testCommunity.id}/notes`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(noteData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.content).toBe(noteData.content);
            expect(response.body.authorId).toBe(testUser.id);
            expect(mockPrisma.note.create).toHaveBeenCalledWith({
                data: {
                    communityId: testCommunity.id,
                    authorId: testUser.id,
                    content: noteData.content,
                },
                 include: {
                    author: { select: { id: true, name: true, avatarUrl: true } }
                }
            });
        });

        it('should return 401 if user is not authenticated', async () => {
            const response = await request(app)
                .post(`/communities/${testCommunity.id}/notes`)
                .send(noteData);

            expect(response.status).toBe(401);
            expect(mockPrisma.note.create).not.toHaveBeenCalled();
        });

         it('should return 403 if user is not a member of the community', async () => {
            const response = await request(app)
                .post(`/communities/${testCommunity.id}/notes`)
                .set('Authorization', `Bearer ${otherUserToken}`) // User not in community
                .send(noteData);

            expect(response.status).toBe(403);
             expect(response.body.message).toContain('not a member');
            expect(mockPrisma.note.create).not.toHaveBeenCalled();
        });

        it('should return 400 if content is missing or empty', async () => {
             const response = await request(app)
                .post(`/communities/${testCommunity.id}/notes`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ content: ' ' }); // Empty content

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('content is required');
            expect(mockPrisma.note.create).not.toHaveBeenCalled();
        });

         it('should return 400 if community ID is invalid', async () => {
            const response = await request(app)
                .post('/communities/invalid/notes')
                .set('Authorization', `Bearer ${userToken}`)
                .send(noteData);

            expect(response.status).toBe(400);
             expect(response.body.message).toContain('Invalid community ID');
            expect(mockPrisma.note.create).not.toHaveBeenCalled();
        });
    });

    // --- GET /communities/:communityId/notes ---
    describe('GET /communities/:communityId/notes', () => {
        it('should return notes for a community member', async () => {
            const notes = [testNote, adminNote];
            (mockPrisma.note.findMany as jest.Mock).mockResolvedValue(notes);

            const response = await request(app)
                .get(`/communities/${testCommunity.id}/notes`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(
                notes.map(note => ({
                    ...note,
                    timestamp: note.timestamp.toISOString(),
                }))
            );
            expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
                where: { communityId: testCommunity.id },
                include: { author: { select: { id: true, name: true, avatarUrl: true } } },
                orderBy: { timestamp: 'desc' },
            });
        });

        it('should return 401 if user is not authenticated', async () => {
             const response = await request(app)
                .get(`/communities/${testCommunity.id}/notes`);
            expect(response.status).toBe(401);
            expect(mockPrisma.note.findMany).not.toHaveBeenCalled();
        });

         it('should return 403 if user is not a member of the community', async () => {
            const response = await request(app)
                .get(`/communities/${testCommunity.id}/notes`)
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(response.status).toBe(403);
             expect(response.body.message).toContain('not a member');
            expect(mockPrisma.note.findMany).not.toHaveBeenCalled();
        });

        it('should return 404 if community not found (but user is not member)', async () => {
             (mockPrisma.community.findUnique as jest.Mock).mockResolvedValueOnce(null);
             const response = await request(app)
                .get(`/communities/9999/notes`)
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Community not found');
            expect(mockPrisma.note.findMany).not.toHaveBeenCalled();
        });

        it('should return 400 if community ID is invalid', async () => {
            const response = await request(app)
                .get('/communities/invalid/notes')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(400);
             expect(response.body.message).toContain('Invalid community ID');
            expect(mockPrisma.note.findMany).not.toHaveBeenCalled();
        });
    });

    // --- PATCH /notes/:id ---
    describe('PATCH /notes/:id', () => {
        const updateData = { content: 'Updated note content' };

        it('should allow the author to update their note', async () => {
            (mockPrisma.note.update as jest.Mock).mockResolvedValue({
                ...testNote,
                content: updateData.content,
                updatedAt: new Date(),
            });

            const response = await request(app)
                .patch(`/notes/${testNote.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.content).toBe(updateData.content);
            expect(response.body.id).toBe(testNote.id);
            expect(mockPrisma.note.update).toHaveBeenCalledWith({
                where: { id: testNote.id },
                data: { content: updateData.content },
                 include: { author: { select: { id: true, name: true, avatarUrl: true } } }
            });
        });

        it('should allow a community admin to update any note in the community', async () => {
             (mockPrisma.note.update as jest.Mock).mockResolvedValue({
                ...testNote,
                content: updateData.content,
                updatedAt: new Date(),
            });

            const response = await request(app)
                .patch(`/notes/${testNote.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.content).toBe(updateData.content);
            expect(mockPrisma.note.update).toHaveBeenCalledWith({
                where: { id: testNote.id },
                data: { content: updateData.content },
                include: { author: { select: { id: true, name: true, avatarUrl: true } } }
            });
        });

        it('should return 403 if a non-author/non-admin tries to update a note', async () => {
            const response = await request(app)
                .patch(`/notes/${adminNote.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData);

            expect(response.status).toBe(403);
             expect(response.body.message).toContain('cannot modify');
            expect(mockPrisma.note.update).not.toHaveBeenCalled();
        });

         it('should return 401 if user is not authenticated', async () => {
            const response = await request(app)
                .patch(`/notes/${testNote.id}`)
                .send(updateData);
            expect(response.status).toBe(401);
            expect(mockPrisma.note.update).not.toHaveBeenCalled();
        });

        it('should return 404 if note not found', async () => {
             (mockPrisma.note.findUnique as jest.Mock).mockResolvedValue(null);
            const response = await request(app)
                .patch('/notes/9999')
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Note not found');
            expect(mockPrisma.note.update).not.toHaveBeenCalled();
        });

         it('should return 400 if content is missing or empty', async () => {
            const response = await request(app)
                .patch(`/notes/${testNote.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ content: '' });

            expect(response.status).toBe(400);
             expect(response.body.message).toContain('content is required');
            expect(mockPrisma.note.update).not.toHaveBeenCalled();
        });

         it('should return 400 if note ID is invalid', async () => {
            const response = await request(app)
                .patch('/notes/invalid')
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData);
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid note ID');
            expect(mockPrisma.note.update).not.toHaveBeenCalled();
        });
    });

    // --- DELETE /notes/:id ---
    describe('DELETE /notes/:id', () => {
        it('should allow the author to delete their note', async () => {
            (mockPrisma.note.delete as jest.Mock).mockResolvedValue(testNote);

            const response = await request(app)
                .delete(`/notes/${testNote.id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(204);
            expect(mockPrisma.note.delete).toHaveBeenCalledWith({
                where: { id: testNote.id },
            });
        });

         it('should allow a community admin to delete any note in the community', async () => {
            (mockPrisma.note.delete as jest.Mock).mockResolvedValue(testNote);

            const response = await request(app)
                .delete(`/notes/${testNote.id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(204);
            expect(mockPrisma.note.delete).toHaveBeenCalledWith({
                where: { id: testNote.id },
            });
        });

        it('should return 403 if a non-author/non-admin tries to delete a note', async () => {
            const response = await request(app)
                .delete(`/notes/${adminNote.id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
             expect(response.body.message).toContain('cannot delete');
            expect(mockPrisma.note.delete).not.toHaveBeenCalled();
        });

         it('should return 401 if user is not authenticated', async () => {
             const response = await request(app)
                .delete(`/notes/${testNote.id}`);
            expect(response.status).toBe(401);
            expect(mockPrisma.note.delete).not.toHaveBeenCalled();
        });

        it('should return 404 if note not found', async () => {
            (mockPrisma.note.findUnique as jest.Mock).mockResolvedValue(null);
            const response = await request(app)
                .delete('/notes/9999')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Note not found');
            expect(mockPrisma.note.delete).not.toHaveBeenCalled();
        });

        it('should return 400 if note ID is invalid', async () => {
            const response = await request(app)
                .delete('/notes/invalid')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid note ID');
            expect(mockPrisma.note.delete).not.toHaveBeenCalled();
        });
    });
}); 