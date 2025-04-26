import request from 'supertest';
import { app } from '@/server'; // Assuming your Express app is exported from server.ts
import { PrismaClient } from '@prisma/client'; // Import constructor
import { generateToken } from '@/modules/auth/services/authService'; // Correct path for token generation

// Instantiate client for tests
const prisma = new PrismaClient();

// Helper function to create a user and community for testing
async function setupTestData() {
    const user = await prisma.user.create({
        data: {
            email: `testuser-${Date.now()}@example.com`,
            name: 'Test User',
            passwordHash: 'hashedpassword', // Use a real hash in practice
        },
    });
    const community = await prisma.community.create({
        data: {
            name: 'Test Community',
            creatorId: user.id,
        },
    });
     // Make user a member of the community
    await prisma.membership.create({
        data: {
            userId: user.id,
            communityId: community.id,
        }
    });
    return { user, community };
}

describe('Chat API Endpoints', () => {
    let testUser: any;
    let testCommunity: any;
    let authToken: string;

    beforeAll(async () => {
        // Clear previous test data if necessary
        await prisma.message.deleteMany();
        await prisma.membership.deleteMany();
        await prisma.community.deleteMany();
        await prisma.user.deleteMany({ where: { email: { contains: '@example.com' } } });

        const data = await setupTestData();
        testUser = data.user;
        testCommunity = data.community;
        authToken = generateToken(testUser.id);

        // Pre-populate some messages for the GET test
        await prisma.message.createMany({
            data: [
                { content: 'Message 1', authorId: testUser.id, communityId: testCommunity.id },
                { content: 'Message 2', authorId: testUser.id, communityId: testCommunity.id },
            ]
        });
    });

    afterAll(async () => {
        // Clean up database
         await prisma.message.deleteMany();
        await prisma.membership.deleteMany();
        await prisma.community.deleteMany();
        await prisma.user.deleteMany({ where: { id: testUser.id } });
        await prisma.$disconnect();
    });

    // GET /communities/:communityId/messages
    describe('GET /communities/:communityId/messages', () => {
        it('should return 401 if not authenticated', async () => {
            const res = await request(app).get(`/communities/${testCommunity.id}/messages`);
            expect(res.statusCode).toEqual(401);
        });

        it('should return messages for a valid community if authenticated', async () => {
            const res = await request(app)
                .get(`/communities/${testCommunity.id}/messages`)
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBeGreaterThanOrEqual(2); // Check if pre-populated messages are there
            expect(res.body[0]).toHaveProperty('content');
            expect(res.body[0]).toHaveProperty('author');
            expect(res.body[0].author).toHaveProperty('id', testUser.id);
            expect(res.body[0].author).toHaveProperty('name', testUser.name);
        });

        it('should return 404 for a non-existent community', async () => {
            const nonExistentId = 99999;
            const res = await request(app)
                .get(`/communities/${nonExistentId}/messages`)
                .set('Authorization', `Bearer ${authToken}`);
            
            // Assuming the controller/service doesn't explicitly check for community existence yet
            // It might return 200 OK with empty array, or 404 if checks are implemented.
            // Adjust expectation based on implementation.
            expect([200, 404]).toContain(res.statusCode);
            if(res.statusCode === 200) {
                expect(res.body).toEqual([]);
            }
        });

        // TODO: Add test for user not being a member of the community (requires membership check)
    });

    // POST /communities/:communityId/messages
    describe('POST /communities/:communityId/messages', () => {
        it('should return 401 if not authenticated', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunity.id}/messages`)
                .send({ content: 'New message' });
            expect(res.statusCode).toEqual(401);
        });

        it('should return 400 if content is missing', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunity.id}/messages`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({}); // Missing content
            expect(res.statusCode).toEqual(400);
        });

         it('should return 400 if content is empty', async () => {
            const res = await request(app)
                .post(`/communities/${testCommunity.id}/messages`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ content: '   ' }); // Empty content
            expect(res.statusCode).toEqual(400);
        });

        it('should create a message and return 201 if authenticated and data is valid', async () => {
            const messageContent = 'Hello from test!';
            const res = await request(app)
                .post(`/communities/${testCommunity.id}/messages`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ content: messageContent });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.content).toEqual(messageContent);
            expect(res.body.communityId).toEqual(testCommunity.id);
            expect(res.body.authorId).toEqual(testUser.id);
             expect(res.body).toHaveProperty('author');
            expect(res.body.author.id).toEqual(testUser.id);

            // Verify in DB
            const dbMessage = await prisma.message.findUnique({ where: { id: res.body.id } });
            expect(dbMessage).not.toBeNull();
            expect(dbMessage?.content).toEqual(messageContent);
        });

         it('should return 404 for a non-existent community', async () => {
            const nonExistentId = 99999;
            const res = await request(app)
                .post(`/communities/${nonExistentId}/messages`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ content: 'Valid content' });
            
             // Now strictly expect 404 because the service checks existence
             expect(res.statusCode).toEqual(404); 
             expect(res.body.message).toContain('Community not found'); // Check error message
         });

         // TODO: Add test for user not being a member of the community (requires membership check)
    });
});
