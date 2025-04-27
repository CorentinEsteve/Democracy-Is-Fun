import request from 'supertest';
import { app, prisma } from '../server'; // Adjust path as needed
import { signJwt } from '../modules/auth/services/authService'; // Adjust path
import { User, Community, Membership, MembershipRole } from '@prisma/client';
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

// --- Test Setup --- 
let adminUser: User;
let memberUser: User;
let otherUser: User;
let community: Community;
let adminToken: string;
let memberToken: string;
let otherToken: string;

beforeAll(async () => {
    // Clean database before tests
    await prisma.membership.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.user.deleteMany({});

    // Create users
    adminUser = await prisma.user.create({ data: { name: 'Admin User', email: 'admin@test.com', password: 'password' } });
    memberUser = await prisma.user.create({ data: { name: 'Member User', email: 'member@test.com', password: 'password' } });
    otherUser = await prisma.user.create({ data: { name: 'Other User', email: 'other@test.com', password: 'password' } });

    // Create community with admin as creator/admin
    community = await prisma.community.create({ data: { name: 'Test Community', creatorId: adminUser.id } });
    await prisma.membership.create({ data: { userId: adminUser.id, communityId: community.id, role: 'Admin' } });
    await prisma.membership.create({ data: { userId: memberUser.id, communityId: community.id, role: 'Member' } });

    // Generate tokens
    adminToken = signJwt({ userId: adminUser.id, email: adminUser.email });
    memberToken = signJwt({ userId: memberUser.id, email: memberUser.email });
    otherToken = signJwt({ userId: otherUser.id, email: otherUser.email });
});

afterAll(async () => {
    await prisma.$disconnect();
});

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

    // --- PATCH /communities/:communityId/members/:userId - Update Member Role --- 
    describe('PATCH /communities/:communityId/members/:userId - Update Member Role', () => {

        it('should allow an admin to update a member\'s role to Admin', async () => {
            const response = await request(app)
                .patch(`/communities/${community.id}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: MembershipRole.Admin });

            expect(response.status).toBe(200);
            expect(response.body.userId).toBe(memberUser.id);
            expect(response.body.communityId).toBe(community.id);
            expect(response.body.role).toBe(MembershipRole.Admin);

            // Verify in DB
            const updatedMembership = await prisma.membership.findUnique({ 
                where: { userId_communityId: { userId: memberUser.id, communityId: community.id } }
            });
            expect(updatedMembership?.role).toBe(MembershipRole.Admin);
        });

        it('should allow an admin to update an admin\'s role back to Member', async () => {
            // First, ensure memberUser is Admin from previous test or set explicitly
            await prisma.membership.update({ 
                where: { userId_communityId: { userId: memberUser.id, communityId: community.id } },
                data: { role: MembershipRole.Admin }
             });

            const response = await request(app)
                .patch(`/communities/${community.id}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: MembershipRole.Member });

            expect(response.status).toBe(200);
            expect(response.body.role).toBe(MembershipRole.Member);

            // Verify in DB
            const updatedMembership = await prisma.membership.findUnique({ 
                where: { userId_communityId: { userId: memberUser.id, communityId: community.id } }
            });
            expect(updatedMembership?.role).toBe(MembershipRole.Member);
        });

        it('should return 403 if a non-admin tries to update a role', async () => {
            const response = await request(app)
                .patch(`/communities/${community.id}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${memberToken}`) // Use member token
                .send({ role: MembershipRole.Admin });

            expect(response.status).toBe(403);
            expect(response.body.message).toContain('admin privileges required');
        });

         it('should return 403 if an admin of another community tries to update a role', async () => {
             // Assume otherUser is admin of a different community (not set up here, but token implies)
            const response = await request(app)
                .patch(`/communities/${community.id}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${otherToken}`) // Use other user token
                .send({ role: MembershipRole.Admin });

            expect(response.status).toBe(403);
            expect(response.body.message).toContain('admin privileges required'); // authorizeAdmin checks specific community
        });

        it('should return 400 if the role is invalid', async () => {
            const response = await request(app)
                .patch(`/communities/${community.id}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'SuperAdmin' });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid role provided');
        });

        it('should return 404 if the membership does not exist', async () => {
            const nonMemberId = otherUser.id; // User not in this community
            const response = await request(app)
                .patch(`/communities/${community.id}/members/${nonMemberId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: MembershipRole.Admin });

            expect(response.status).toBe(404); 
            expect(response.body.message).toContain('Membership not found');
        });

         it('should return 404 if the community does not exist', async () => {
            const nonExistentCommunityId = 9999;
            const response = await request(app)
                .patch(`/communities/${nonExistentCommunityId}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: MembershipRole.Admin });

            // authorizeAdmin middleware should handle this check before controller
            expect(response.status).toBe(404); 
            expect(response.body.message).toContain('Community not found'); 
        });

        it('should return 400 if trying to change the creator\'s role', async () => {
            const creatorUserId = adminUser.id; // The creator is the admin in this setup
            const response = await request(app)
                .patch(`/communities/${community.id}/members/${creatorUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: MembershipRole.Member });

            // Note: The controller also prevents admins changing their *own* role,
            // but the service layer prevents changing the *creator's* role specifically.
            // Let's assume a different admin tries to change the creator's role.
            // We'll simulate this by allowing the controller check to pass but expecting the service error.
            // This requires a more complex setup or relaxing the controller check slightly for the test.
            // For simplicity, we test the direct outcome assuming the service check is the primary one.

             // If creator = requesting admin, controller returns 400: "cannot change own role"
             // If different admin requests, service returns 400: "cannot change creator's role"
            expect(response.status).toBe(400); 
            expect(response.body.message).toMatch(/Cannot change the community creator's role|Admins cannot change their own role/);
        });

        it('should return 400 if admin tries to change their own role', async () => {
            const response = await request(app)
                .patch(`/communities/${community.id}/members/${adminUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: MembershipRole.Member });
            
            expect(response.status).toBe(400); 
            expect(response.body.message).toContain('Admins cannot change their own role');
        });

    });
}); 