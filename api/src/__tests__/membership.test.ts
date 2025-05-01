import request from 'supertest';
import { app, prisma } from '../server'; // Adjust path as necessary
import { generateToken } from '../modules/auth/services/authService'; // Use generateToken
import { User, Community, Membership, PrismaClient } from '@prisma/client'; // Import PrismaClient
import bcrypt from 'bcrypt'; // Import bcrypt for hashing dummy password

let adminToken: string;
let memberToken: string;
let otherToken: string;
let adminUser: User;
let memberUser: User;
let otherUser: User;
let testCommunity: Community;
let testCommunityId: number;

// Define a dummy password hash for tests
const dummyPasswordHash = bcrypt.hashSync('password123', 10);

// jest.mock('../server', () => ({
//   prisma: mockPrisma, 
//   app: jest.requireActual('../server').app // Keep the actual app
// }));


describe('Membership API', () => {
    beforeAll(async () => {
        // Clean database before tests
        await prisma.membership.deleteMany({});
        await prisma.community.deleteMany({});
        await prisma.user.deleteMany({});

        // Create users
        adminUser = await prisma.user.create({ data: { name: 'Admin User', email: 'admin@test.com', passwordHash: dummyPasswordHash } });
        memberUser = await prisma.user.create({ data: { name: 'Member User', email: 'member@test.com', passwordHash: dummyPasswordHash } });
        otherUser = await prisma.user.create({ data: { name: 'Other User', email: 'other@test.com', passwordHash: dummyPasswordHash } });

        // Create tokens
        adminToken = generateToken(adminUser.id);
        memberToken = generateToken(memberUser.id);
        otherToken = generateToken(otherUser.id);

        // Create a community
        testCommunity = await prisma.community.create({
            data: {
                name: 'Test Community for Members',
                creatorId: adminUser.id,
            },
        });
        testCommunityId = testCommunity.id;

        // Create initial memberships (Admin is creator, add Member)
        await prisma.membership.create({ data: { userId: adminUser.id, communityId: testCommunityId, role: 'Admin' } });
        await prisma.membership.create({ data: { userId: memberUser.id, communityId: testCommunityId, role: 'Member' } });
    });

    afterAll(async () => {
        await prisma.membership.deleteMany({});
        await prisma.community.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.$disconnect();
    });

    // Add a general beforeEach to reset potentially added/modified memberships
    beforeEach(async () => {
        // Delete potential membership for otherUser created in POST tests
        await prisma.membership.deleteMany({
            where: {
                userId: otherUser.id,
                communityId: testCommunityId
            }
        });
        // Reset memberUser role which might be changed in PATCH tests
        await prisma.membership.updateMany({
             where: { userId: memberUser.id, communityId: testCommunityId },
             data: { role: 'Member' }
        });
    });

    // --- GET /communities/:communityId/members --- 
    describe('GET /communities/:communityId/members', () => {
        it('should list members for an existing community member', async () => {
            const res = await request(app)
                .get(`/communities/${testCommunityId}/members`)
                .set('Authorization', `Bearer ${memberToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBe(2); // Admin + Member
            expect(res.body.some((m: any) => m.userId === adminUser.id)).toBe(true);
            expect(res.body.some((m: any) => m.userId === memberUser.id)).toBe(true);
        });

        it('should return 403 if user is not a member', async () => {
             const res = await request(app)
                .get(`/communities/${testCommunityId}/members`)
                .set('Authorization', `Bearer ${otherToken}`);
            expect(res.statusCode).toEqual(403);
        });
         it('should return 404 if community does not exist', async () => {
            const nonExistentId = 99999;
            const res = await request(app)
                .get(`/communities/${nonExistentId}/members`)
                .set('Authorization', `Bearer ${adminToken}`); // Use any valid token
            expect(res.statusCode).toEqual(404); 
        });

        it('should return 401 if not authenticated', async () => {
             const res = await request(app)
                .get(`/communities/${testCommunityId}/members`);
            expect(res.statusCode).toEqual(401);
        });
    });

    // --- POST /communities/:communityId/members --- 
    describe('POST /communities/:communityId/members', () => {
        it('should allow an admin to add a new member by email', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunityId}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ userIdentifier: otherUser.email }); // Add by email
            
            expect(res.statusCode).toEqual(201);
            expect(res.body.userId).toEqual(otherUser.id);
            expect(res.body.communityId).toEqual(testCommunityId);
            expect(res.body.role).toEqual('Member'); // Default role
        });

         it('should allow an admin to add a new member by ID', async () => {
            // First remove the user added previously to avoid conflict
            await prisma.membership.deleteMany({ where: { userId: otherUser.id, communityId: testCommunityId } });
            
            const res = await request(app)
                .post(`/communities/${testCommunityId}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ userIdentifier: String(otherUser.id) }); // Add by ID (as string)
            
            expect(res.statusCode).toEqual(201);
            expect(res.body.userId).toEqual(otherUser.id);
        });

        it('should return 409 if user is already a member', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunityId}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ userIdentifier: memberUser.email }); // Try adding existing member
            expect(res.statusCode).toEqual(409);
        });

        it('should return 404 if user to add does not exist', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunityId}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ userIdentifier: 'nonexistent@test.com' });
            expect(res.statusCode).toEqual(404);
        });

        it('should return 403 if requester is not an admin', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunityId}/members`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({ userIdentifier: otherUser.email });
            expect(res.statusCode).toEqual(403);
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunityId}/members`)
                .send({ userIdentifier: otherUser.email });
            expect(res.statusCode).toEqual(401);
        });
         it('should return 400 if userIdentifier is missing', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunityId}/members`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({}); // Missing identifier
            expect(res.statusCode).toEqual(400);
        });
        
        // Cannot add self test is handled within service

    });

    // --- PATCH /communities/:communityId/members/:userId --- 
    describe('PATCH /communities/:communityId/members/:userId', () => {
        it('should allow an admin to update a member role to Admin', async () => {
            const res = await request(app)
                .patch(`/communities/${testCommunityId}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'Admin' }); // Update to Admin (string)
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.role).toEqual('Admin');
        });

        it('should allow an admin to update a member role to Member', async () => {
            // First ensure the user is Admin
            await prisma.membership.update({ 
                where: { userId_communityId: { userId: memberUser.id, communityId: testCommunityId } }, 
                data: { role: 'Admin' } 
            });
            
            const res = await request(app)
                .patch(`/communities/${testCommunityId}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'Member' }); // Update to Member (string)
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.role).toEqual('Member');
        });
        
        it('should return 400 for invalid role value', async () => {
            const res = await request(app)
                .patch(`/communities/${testCommunityId}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'SuperAdmin' }); // Invalid role
            expect(res.statusCode).toEqual(400);
        });

        it('should return 404 if membership does not exist', async () => {
            const res = await request(app)
                .patch(`/communities/${testCommunityId}/members/${otherUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'Admin' });
            expect(res.statusCode).toEqual(404);
        });

        it('should return 403 if requester is not an admin', async () => {
            const res = await request(app)
                .patch(`/communities/${testCommunityId}/members/${memberUser.id}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({ role: 'Admin' });
            expect(res.statusCode).toEqual(403);
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app)
                .patch(`/communities/${testCommunityId}/members/${memberUser.id}`)
                .send({ role: 'Admin' });
            expect(res.statusCode).toEqual(401);
        });
        
        it('should return 400 if attempting to change creator role from Admin', async () => {
            const res = await request(app)
                .patch(`/communities/${testCommunityId}/members/${adminUser.id}`) // Target admin/creator
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'Member' }); // Try demoting
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toContain('Cannot change the role');
        });
    });

    // --- DELETE /communities/:communityId/members/:userId --- 
    describe('DELETE /communities/:communityId/members/:userId', () => {
         beforeEach(async () => {
            // Specific setup for DELETE: Ensure otherUser IS a member before each test in this block
            await prisma.membership.upsert({
                where: { userId_communityId: { userId: otherUser.id, communityId: testCommunityId } },
                update: { role: 'Member' }, // Ensure role is Member if updating
                create: { userId: otherUser.id, communityId: testCommunityId, role: 'Member' }
            });
        });
        
        it('should allow an admin to remove a member', async () => {
            const res = await request(app)
                .delete(`/communities/${testCommunityId}/members/${otherUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toEqual(204);
            
            // Verify member was removed
            const membership = await prisma.membership.findUnique({
                where: { userId_communityId: { userId: otherUser.id, communityId: testCommunityId } }
            });
            expect(membership).toBeNull();
        });

        it('should return 404 if membership does not exist', async () => {
             // Remove first
             await prisma.membership.deleteMany({ where: { userId: otherUser.id, communityId: testCommunityId } });
             
             const res = await request(app)
                .delete(`/communities/${testCommunityId}/members/${otherUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should return 403 if requester is not an admin', async () => {
            const res = await request(app)
                .delete(`/communities/${testCommunityId}/members/${otherUser.id}`)
                .set('Authorization', `Bearer ${memberToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app)
                .delete(`/communities/${testCommunityId}/members/${otherUser.id}`);
            expect(res.statusCode).toEqual(401);
        });
        
         it('should return 400 if attempting to remove the creator', async () => {
            const res = await request(app)
                .delete(`/communities/${testCommunityId}/members/${adminUser.id}`) // Try removing creator
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(400);
             expect(res.body.message).toContain('Cannot remove the community creator');
        });
    });
}); 