import request from 'supertest';
import { app, prisma } from '../server';
import * as authService from '../modules/auth/services/authService';
import { User, Community } from '@prisma/client';

// Helper function to create a user and return token
const createUserAndGetToken = async (
  email: string,
  name: string,
  password = 'password123'
): Promise<{ user: User; token: string }> => {
  const passwordHash = await authService.hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });
  const token = authService.generateToken(user.id);
  return { user, token };
};

describe('Community API', () => {
  let user1: User;
  let token1: string;
  let user2: User;
  let token2: string;

  beforeAll(async () => {
    // Clear potential leftover data
    await prisma.membership.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.user.deleteMany({});

    // Create users for testing
    const u1Data = await createUserAndGetToken('user1@community.test', 'User One');
    user1 = u1Data.user;
    token1 = u1Data.token;

    const u2Data = await createUserAndGetToken('user2@community.test', 'User Two');
    user2 = u2Data.user;
    token2 = u2Data.token;
  });

  afterAll(async () => {
    // Clean up database
    await prisma.membership.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
     // Clean communities/memberships before each test within the suite
     await prisma.membership.deleteMany({});
     await prisma.community.deleteMany({});
  })

  // --- POST /communities --- 
  describe('POST /communities', () => {
    it('should create a new community with the user as admin', async () => {
      const communityData = {
        name: 'Test Community 1',
        description: 'A community for testing',
      };

      const response = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token1}`)
        .send(communityData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(communityData.name);
      expect(response.body.description).toBe(communityData.description);
      expect(response.body.creatorId).toBe(user1.id);
      expect(response.body.memberships).toHaveLength(1);
      expect(response.body.memberships[0].userId).toBe(user1.id);
      expect(response.body.memberships[0].role).toBe('Admin');
      expect(response.body.memberships[0].user.name).toBe(user1.name);

      // Verify in DB
      const dbCommunity = await prisma.community.findUnique({
        where: { id: response.body.id },
        include: { memberships: true },
      });
      expect(dbCommunity).not.toBeNull();
      expect(dbCommunity?.memberships).toHaveLength(1);
      expect(dbCommunity?.memberships[0].userId).toBe(user1.id);
      expect(dbCommunity?.memberships[0].role).toBe('Admin');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token1}`)
        .send({ description: 'Missing name' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Community name is required');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/communities')
        .send({ name: 'No Auth Community' });

      expect(response.status).toBe(401);
    });
  });

  // --- GET /communities --- 
  describe('GET /communities', () => {
    let community1: Community;
    let community2: Community;

    beforeEach(async () => {
        // Use direct Prisma calls for setup (separate steps)
        community1 = await prisma.community.create({
            data: {
                name: 'User1 Community',
                creatorId: user1.id,
            },
        });
        await prisma.membership.create({
            data: { userId: user1.id, communityId: community1.id, role: 'Admin' },
        });

        community2 = await prisma.community.create({
            data: {
                name: 'User2 Community',
                creatorId: user2.id,
            },
        });
        await prisma.membership.create({
            data: { userId: user2.id, communityId: community2.id, role: 'Admin' },
        });

         // Add user1 as a member to community2 for testing list filtering
         await prisma.membership.create({
            data: { userId: user1.id, communityId: community2.id, role: 'Member'}
         })
    });

    it('should return only communities the user is a member of', async () => {
      const response = await request(app)
        .get('/communities')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2); // User1 is member of community1 and community2
      // Check if both communities are present (order might vary)
      expect(response.body.map((c: Community) => c.id).sort()).toEqual([community1.id, community2.id].sort());
    });

     it('should return an empty array if the user is not a member of any community', async () => {
        // Create a third user with no communities
        const { token: token3 } = await createUserAndGetToken('user3@community.test', 'User Three');

        const response = await request(app)
            .get('/communities')
            .set('Authorization', `Bearer ${token3}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/communities');
      expect(response.status).toBe(401);
    });
  });

  // --- GET /communities/:id --- 
  describe('GET /communities/:id', () => {
    let community1: Community;

    beforeEach(async () => {
      // Use direct Prisma calls for setup (separate steps)
      community1 = await prisma.community.create({
        data: {
            name: 'Detail Community',
            creatorId: user1.id,
        },
      });
      await prisma.membership.create({
        data: { userId: user1.id, communityId: community1.id, role: 'Admin' },
      });
    });

    it('should return community details if user is a member', async () => {
      const response = await request(app)
        .get(`/communities/${community1.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(community1.id);
      expect(response.body.name).toBe('Detail Community');
      expect(response.body.memberships).toBeDefined();
      expect(response.body.memberships).toHaveLength(1);
      expect(response.body.memberships[0].userId).toBe(user1.id);
    });

    it('should return 403 if user is not a member', async () => {
      const response = await request(app)
        .get(`/communities/${community1.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: User is not a member of this community');
    });

    it('should return 404 if community does not exist', async () => {
      const nonExistentId = 99999;
      const response = await request(app)
        .get(`/communities/${nonExistentId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(404);
       expect(response.body.message).toBe('Community not found');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get(`/communities/${community1.id}`);
      expect(response.status).toBe(401);
    });
  });

  // --- PATCH /communities/:id --- 
  describe('PATCH /communities/:id', () => {
     let community1: Community;

     beforeEach(async () => {
        // Use direct Prisma calls for setup (separate steps)
        community1 = await prisma.community.create({
            data: {
                name: 'Patch Me',
                creatorId: user1.id,
            },
        });
        // Create memberships separately
        await prisma.membership.createMany({
            data: [
                { userId: user1.id, communityId: community1.id, role: 'Admin' }, // User1 is Admin
                { userId: user2.id, communityId: community1.id, role: 'Member'}  // User2 is Member
            ],
        });
     });

     it('should update community details if user is admin', async () => {
       const updateData = {
         name: 'Patched Community',
         description: 'Updated description',
       };
       const response = await request(app)
         .patch(`/communities/${community1.id}`)
         .set('Authorization', `Bearer ${token1}`)
         .send(updateData);

       expect(response.status).toBe(200);
       expect(response.body.name).toBe(updateData.name);
       expect(response.body.description).toBe(updateData.description);

       // Verify in DB
       const dbCommunity = await prisma.community.findUnique({ where: { id: community1.id } });
       expect(dbCommunity?.name).toBe(updateData.name);
     });

    it('should return 403 if user is a member but not admin', async () => {
        const updateData = { name: 'Should Fail Patch' };
        const response = await request(app)
            .patch(`/communities/${community1.id}`)
            .set('Authorization', `Bearer ${token2}`)
            .send(updateData);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden: User is not an admin of this community');
    });

    it('should return 404 if community does not exist (when attempting update as admin)', async () => {
        const nonExistentId = 99999;
        const updateData = { name: 'Should Fail Patch 404' };
        const response = await request(app)
            .patch(`/communities/${nonExistentId}`)
            .set('Authorization', `Bearer ${token1}`)
            .send(updateData);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Community not found');
    });

    it('should return 401 if not authenticated', async () => {
        const updateData = { name: 'No Auth Patch' };
        const response = await request(app)
            .patch(`/communities/${community1.id}`)
            .send(updateData);
        expect(response.status).toBe(401);
    });
  });

  // --- DELETE /communities/:id --- 
  describe('DELETE /communities/:id', () => {
    let communityToDelete: Community;

    beforeEach(async () => {
        // Use direct Prisma calls for setup (separate steps)
        communityToDelete = await prisma.community.create({
            data: {
                name: 'Delete Me',
                creatorId: user1.id,
            },
        });
        // Create memberships separately
        await prisma.membership.createMany({
            data: [
                { userId: user1.id, communityId: communityToDelete.id, role: 'Admin' }, // User1 is Admin
                { userId: user2.id, communityId: communityToDelete.id, role: 'Member'}  // User2 is Member
            ],
        });
      });

    it('should delete the community if user is admin', async () => {
        const response = await request(app)
            .delete(`/communities/${communityToDelete.id}`)
            .set('Authorization', `Bearer ${token1}`);

        expect(response.status).toBe(204);

        // Verify in DB
        const dbCommunity = await prisma.community.findUnique({ where: { id: communityToDelete.id } });
        expect(dbCommunity).toBeNull();
        const dbMemberships = await prisma.membership.findMany({ where: { communityId: communityToDelete.id }});
        expect(dbMemberships).toHaveLength(0); // Assuming cascade delete or explicit delete in service works
    });

    it('should return 403 if user is a member but not admin', async () => {
        const response = await request(app)
            .delete(`/communities/${communityToDelete.id}`)
            .set('Authorization', `Bearer ${token2}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden: User is not an admin of this community');
    });

    it('should return 404 if community does not exist (when attempting delete as admin)', async () => {
        const nonExistentId = 99999;
        const response = await request(app)
            .delete(`/communities/${nonExistentId}`)
            .set('Authorization', `Bearer ${token1}`);

        expect(response.status).toBe(404);
         expect(response.body.message).toBe('Community not found');
    });

     it('should return 401 if not authenticated', async () => {
        const response = await request(app).delete(`/communities/${communityToDelete.id}`);
        expect(response.status).toBe(401);
    });
  });
}); 