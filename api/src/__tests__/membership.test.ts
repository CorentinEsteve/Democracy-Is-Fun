import request from 'supertest';
import { app } from '../server'; // Import app only
import { User, Community, Membership, PrismaClient } from '@prisma/client';
import { RoleType } from '../types';
import jwt from 'jsonwebtoken';

// Mock the Prisma client module
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    membership: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    community: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
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
            } catch (error) { /* Ignore */ }
        }
        next();
    },
}));

// Mock the authorizeAdmin middleware
jest.mock('../middleware/authorizeAdmin', () => ({
    authorizeAdmin: jest.fn((req: any, res: any, next: () => void) => {
        const requestingUserId = req.user?.userId;
        if (requestingUserId === 2) { // Assuming user 2 is admin (based on test data)
            next();
        } else {
            res.status(403).json({ message: 'Mock Forbidden: Not Admin' });
        }
    })
}));


const mockPrisma = new PrismaClient();

// Helper to generate JWT for tests
const generateTestToken = (userId: number, email: string = 'test@example.com'): string => {
    return jwt.sign({ userId, email }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Membership API Endpoints', () => {
    let testUser: User;
    let testAdmin: User;
    let userToAdd: User;
    let testCommunity: Community;
    let userMembership: Membership;
    let adminMembership: Membership;
    let userToken: string;
    let adminToken: string;
    let userToAddToken: string;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup test data
        testUser = { id: 1, email: 'member@example.com', name: 'Test Member', passwordHash: 'hash', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
        testAdmin = { id: 2, email: 'admin@example.com', name: 'Test Admin', passwordHash: 'hash', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
        userToAdd = { id: 3, email: 'new@example.com', name: 'New User', passwordHash: 'hash', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() };
        testCommunity = { id: 101, name: 'Membership Test Community', description: null, imageUrl: null, creatorId: testAdmin.id, createdAt: new Date(), updatedAt: new Date() };
        userMembership = { userId: testUser.id, communityId: testCommunity.id, role: 'Member', points: 0, joinedAt: new Date() };
        adminMembership = { userId: testAdmin.id, communityId: testCommunity.id, role: 'Admin', points: 0, joinedAt: new Date() };

        userToken = generateTestToken(testUser.id, testUser.email);
        adminToken = generateTestToken(testAdmin.id, testAdmin.email);
        userToAddToken = generateTestToken(userToAdd.id, userToAdd.email);

        // Mock Prisma responses
        (mockPrisma.membership.findUnique as jest.Mock)
            .mockImplementation(async ({ where: { userId_communityId } }) => {
                 if (userId_communityId.userId === testUser.id && userId_communityId.communityId === testCommunity.id) return userMembership;
                 if (userId_communityId.userId === testAdmin.id && userId_communityId.communityId === testCommunity.id) return adminMembership;
                 if (userId_communityId.userId === userToAdd.id && userId_communityId.communityId === testCommunity.id) return null;
                 return null;
            });
        (mockPrisma.user.findUnique as jest.Mock)
            .mockImplementation(async ({ where: { id } }) => {
                if (id === testUser.id) return testUser;
                if (id === testAdmin.id) return testAdmin;
                if (id === userToAdd.id) return userToAdd;
                return null;
            });
        (mockPrisma.community.findUnique as jest.Mock)
            .mockImplementation(async ({ where: { id } }) => {
                if (id === testCommunity.id) return testCommunity;
                return null;
            });

          // Reset authorizeAdmin mock implementation for each test
          const authorizeAdminMock = require('../middleware/authorizeAdmin').authorizeAdmin;
          authorizeAdminMock.mockImplementation((req: any, res: any, next: () => void) => {
              const requestingUserId = req.user?.userId;
              if (requestingUserId === testAdmin.id) { // User 2 is admin
                  next();
              } else {
                  res.status(403).json({ message: 'Mock Forbidden: Not Admin' });
              }
          });
    });

    // --- POST /communities/:communityId/members --- 
    describe('POST /communities/:communityId/members', () => {

        it('should allow an admin to add a member', async () => {
            const addMemberData = { userId: userToAdd.id }; 
            const newMembershipData = { userId: userToAdd.id, communityId: testCommunity.id, role: 'Member', points: 0, joinedAt: new Date() }; 
            (mockPrisma.membership.create as jest.Mock).mockResolvedValue(newMembershipData);

            const response = await request(app)
                .post(`/communities/${testCommunity.id}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(addMemberData);

            expect(response.status).toBe(201);
             // Convert date to string for comparison
            expect(response.body).toEqual({
                ...newMembershipData,
                joinedAt: newMembershipData.joinedAt.toISOString()
            });
            expect(mockPrisma.membership.create).toHaveBeenCalledWith({
                data: { userId: userToAdd.id, communityId: testCommunity.id, role: 'Member', points: 0 }
            });
        });

        it('should return 403 if a non-admin tries to add a member', async () => {
            const addMemberData = { userId: userToAdd.id }; 
            const response = await request(app)
                .post(`/communities/${testCommunity.id}/members`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(addMemberData);

            expect(response.status).toBe(403);
            expect(response.body.message).toContain('Not Admin'); 
            expect(mockPrisma.membership.create).not.toHaveBeenCalled();
        });

        it('should return 409 if user is already a member', async () => {
            const addMemberData = { userId: testUser.id }; 
            const prismaError = { code: 'P2002', meta: { target: ['userId', 'communityId'] } };
            (mockPrisma.membership.create as jest.Mock).mockRejectedValue(prismaError);

            const response = await request(app)
                .post(`/communities/${testCommunity.id}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(addMemberData); 

            expect(response.status).toBe(409);
            expect(response.body.message).toContain('already a member');
        });

        it('should return 400 if userId is missing or invalid', async () => {
            const response = await request(app)
                .post(`/communities/${testCommunity.id}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({}); 
            expect(response.status).toBe(400);

             const response2 = await request(app)
                .post(`/communities/${testCommunity.id}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({userId: 'invalid'}); 
            expect(response2.status).toBe(400);
        });
         it('should return 404 if user to add does not exist', async () => {
            const addMemberData = { userId: 999 }; 
            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null); // Simulate user not found
            const response = await request(app)
                .post(`/communities/${testCommunity.id}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(addMemberData); 
            expect(response.status).toBe(404);
            expect(response.body.message).toContain('User to be added does not exist');
        });
    });

    // --- GET /communities/:communityId/members --- 
    describe('GET /communities/:communityId/members', () => {
         
        it('should allow a member to list members', async () => {
             const membersListRaw = [
                { ...adminMembership },
                { ...userMembership },
            ];
             // Expected structure should match what the MOCK returns
             // In this setup, the mock findMany doesn't add the user object, 
             // so we compare against the raw membership data + serialized date.
             const membersListExpected = membersListRaw.map(m => ({
                 ...m,
                 joinedAt: m.joinedAt.toISOString()
             }));
            (mockPrisma.membership.findMany as jest.Mock).mockResolvedValue(membersListRaw);

            const response = await request(app)
                .get(`/communities/${testCommunity.id}/members`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(membersListExpected.map(m => ({...m, joinedAt: m.joinedAt})));
             expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
                where: { communityId: testCommunity.id },
                include: { user: { select: { id: true, name: true, avatarUrl: true } } },
                orderBy: { user: { name: 'asc' } }
            });
        });

        it('should return 403 if the user is not a member', async () => {
            const response = await request(app)
                .get(`/communities/${testCommunity.id}/members`)
                .set('Authorization', `Bearer ${userToAddToken}`); 

            expect(response.status).toBe(403);
            expect(response.body.message).toContain('not a member');
            expect(mockPrisma.membership.findMany).not.toHaveBeenCalled();
        });

        it('should return 404 if community does not exist', async () => {
            (mockPrisma.community.findUnique as jest.Mock).mockResolvedValue(null);
            const response = await request(app)
                .get(`/communities/9999/members`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Community not found');
            expect(mockPrisma.membership.findMany).not.toHaveBeenCalled();
        });
    });

    // --- DELETE /communities/:communityId/members/:userId --- 
    describe('DELETE /communities/:communityId/members/:userId', () => {
         it('should allow an admin to remove a member', async () => {
            (mockPrisma.membership.delete as jest.Mock).mockResolvedValue(userMembership);

            const response = await request(app)
                .delete(`/communities/${testCommunity.id}/members/${testUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(204);
            expect(mockPrisma.membership.delete).toHaveBeenCalledWith({
                where: { userId_communityId: { userId: testUser.id, communityId: testCommunity.id } }
            });
        });

        it('should return 403 if a non-admin tries to remove a member', async () => {
            const response = await request(app)
                .delete(`/communities/${testCommunity.id}/members/${testUser.id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.message).toContain('Not Admin');
            expect(mockPrisma.membership.delete).not.toHaveBeenCalled();
        });

        it('should return 404 if membership to delete does not exist', async () => {
            const prismaError = { code: 'P2025' };
            (mockPrisma.membership.delete as jest.Mock).mockRejectedValue(prismaError);

             const response = await request(app)
                .delete(`/communities/${testCommunity.id}/members/${userToAdd.id}`) 
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Membership not found');
        });

        it('should return 400 if trying to remove the creator', async () => {
            (mockPrisma.community.findUnique as jest.Mock).mockResolvedValue(testCommunity);
             (mockPrisma.membership.delete as jest.Mock).mockImplementation(async ({where}) => {
                if(where.userId_communityId.userId === testCommunity.creatorId) {
                    throw new Error('Cannot remove the community creator.');
                }
                // This mock should return *something* on success to avoid issues
                // Returning the found membership makes sense, though it's deleted
                const membership = where.userId_communityId.userId === testUser.id ? userMembership : adminMembership;
                return membership; 
            });

            const response = await request(app)
                .delete(`/communities/${testCommunity.id}/members/${testAdmin.id}`) 
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Cannot remove the community creator');
        });
    });
}); 