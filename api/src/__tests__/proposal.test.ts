import request from 'supertest';
import { app, prisma } from '../server';
import * as authService from '../modules/auth/services/authService';
import * as proposalService from '../modules/proposal/services/proposalService';
import { User, Community, Proposal, Vote } from '@prisma/client';

// Helper function from community tests (ensure it's available or redefine)
const createUserAndGetToken = async (
  email: string,
  name: string,
  password = 'password123'
): Promise<{ user: User; token: string }> => {
    // Check if user exists first to handle potential parallel test runs if needed
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        const token = authService.generateToken(user.id);
        return { user, token };
    }
    // If not exists, create
    const passwordHash = await authService.hashPassword(password);
    user = await prisma.user.create({
        data: { email, name, passwordHash },
    });
    const token = authService.generateToken(user.id);
    return { user, token };
};

// Helper to create community
const createTestCommunity = async (creatorId: number, name: string): Promise<Community> => {
    const community = await prisma.community.create({
        data: { name, creatorId },
    });
    await prisma.membership.create({
        data: { communityId: community.id, userId: creatorId, role: 'Admin' },
    });
    return community;
}

// Helper to create proposal (without auto vote)
const createTestProposal = async (communityId: number, initiatorId: number, title: string, deadline: Date, status = 'Active', quorumPct = 50): Promise<Proposal> => {
    return prisma.proposal.create({
        data: {
            communityId,
            initiatorId,
            title,
            deadline,
            tags: '[]', // Default empty JSON array
            status,
            quorumPct
        }
    });
}

describe('Proposal API', () => {
  let user1: User, user2: User, user3: User;
  let token1: string, token2: string, token3: string;
  let community1: Community;

  beforeAll(async () => {
    await prisma.vote.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.membership.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.user.deleteMany({});

    const u1 = await createUserAndGetToken('user1@proposal.test', 'Prop User 1');
    user1 = u1.user; token1 = u1.token;
    const u2 = await createUserAndGetToken('user2@proposal.test', 'Prop User 2');
    user2 = u2.user; token2 = u2.token;
    const u3 = await createUserAndGetToken('user3@proposal.test', 'Prop User 3');
    user3 = u3.user; token3 = u3.token;

    community1 = await createTestCommunity(user1.id, 'Proposal Community');
    // Add user2 and user3 as members
    await prisma.membership.createMany({
        data: [
            { communityId: community1.id, userId: user2.id, role: 'Member' },
            { communityId: community1.id, userId: user3.id, role: 'Member' },
        ]
    })
  });

  afterAll(async () => {
    await prisma.vote.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.membership.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
     // Clean proposals/votes before each test
     await prisma.vote.deleteMany({});
     await prisma.proposal.deleteMany({});
  })

  // --- POST /communities/:communityId/proposals --- 
  describe('POST /communities/:communityId/proposals', () => {
    it('should create a proposal and auto-vote For by initiator', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7); // 1 week deadline
      const proposalData = {
        title: 'First Proposal',
        description: 'Test description',
        tags: ['test', 'api'],
        deadline: deadline.toISOString(),
      };

      const response = await request(app)
        .post(`/communities/${community1.id}/proposals`)
        .set('Authorization', `Bearer ${token1}`)
        .send(proposalData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(proposalData.title);
      expect(response.body.initiatorId).toBe(user1.id);
      expect(response.body.communityId).toBe(community1.id);
      expect(response.body.status).toBe('Active');
      expect(response.body.tags).toEqual(proposalData.tags);
      expect(response.body.votes).toHaveLength(1);
      expect(response.body.votes[0].voterId).toBe(user1.id);
      expect(response.body.votes[0].voteType).toBe('For');

      // Verify in DB
      const dbVotes = await prisma.vote.findMany({ where: { proposalId: response.body.id } });
      expect(dbVotes).toHaveLength(1);
      expect(dbVotes[0].voterId).toBe(user1.id);
      expect(dbVotes[0].voteType).toBe('For');
    });

    it('should return 400 if title or deadline is missing', async () => {
        const deadline = new Date(); deadline.setDate(deadline.getDate() + 1);
        const missingTitle = await request(app)
            .post(`/communities/${community1.id}/proposals`)
            .set('Authorization', `Bearer ${token1}`)
            .send({ description: 'No title', deadline: deadline.toISOString() });
        const missingDeadline = await request(app)
            .post(`/communities/${community1.id}/proposals`)
            .set('Authorization', `Bearer ${token1}`)
            .send({ title: 'No deadline' });

        expect(missingTitle.status).toBe(400);
        expect(missingDeadline.status).toBe(400);
    });

    it('should return 403 if user is not a member of the community', async () => {
        const otherCommunity = await createTestCommunity(user2.id, 'Other Community');
        const deadline = new Date(); deadline.setDate(deadline.getDate() + 1);
        const response = await request(app)
            .post(`/communities/${otherCommunity.id}/proposals`)
            .set('Authorization', `Bearer ${token1}`) // User1 trying to post in User2's community
            .send({ title: 'Invade', deadline: deadline.toISOString() });
        expect(response.status).toBe(403);
    });

    it('should return 401 if not authenticated', async () => {
        const deadline = new Date(); deadline.setDate(deadline.getDate() + 1);
        const response = await request(app)
            .post(`/communities/${community1.id}/proposals`)
            .send({ title: 'No Auth Prop', deadline: deadline.toISOString() });
        expect(response.status).toBe(401);
    });
  });

  // --- GET /communities/:communityId/proposals --- 
  describe('GET /communities/:communityId/proposals', () => {
      let proposal1: Proposal, proposal2: Proposal;

      beforeEach(async () => {
          const deadline = new Date(); deadline.setDate(deadline.getDate() + 1);
          proposal1 = await createTestProposal(community1.id, user1.id, 'Active Prop', deadline, 'Active');
          proposal2 = await createTestProposal(community1.id, user2.id, 'Approved Prop', deadline, 'Approved');
          // Add votes for proposal1
          await prisma.vote.createMany({
              data: [
                  { proposalId: proposal1.id, voterId: user1.id, voteType: 'For' },
                  { proposalId: proposal1.id, voterId: user2.id, voteType: 'Against' },
              ]
          })
      });

    it('should list all proposals in a community by default', async () => {
        const response = await request(app)
            .get(`/communities/${community1.id}/proposals`)
            .set('Authorization', `Bearer ${token1}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        // Check enrichment
        const prop1 = response.body.find((p: any) => p.id === proposal1.id);
        expect(prop1.voteCounts).toEqual({ For: 1, Against: 1, Neutral: 0 });
        expect(prop1.waitingVoters).toHaveLength(1); // user3 hasn't voted
        expect(prop1.waitingVoters[0].id).toBe(user3.id);
    });

    it('should list proposals filtered by status=active', async () => {
        const response = await request(app)
            .get(`/communities/${community1.id}/proposals?status=Active`)
            .set('Authorization', `Bearer ${token1}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].id).toBe(proposal1.id);
        expect(response.body[0].status).toBe('Active');
    });

    it('should list proposals filtered by status=approved', async () => {
        const response = await request(app)
            .get(`/communities/${community1.id}/proposals?status=Approved`)
            .set('Authorization', `Bearer ${token1}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].id).toBe(proposal2.id);
        expect(response.body[0].status).toBe('Approved');
    });

    it('should return 403 if user is not a member', async () => {
        const { token: token4 } = await createUserAndGetToken('user4@proposal.test', 'Outsider');
         const response = await request(app)
            .get(`/communities/${community1.id}/proposals`)
            .set('Authorization', `Bearer ${token4}`);
        expect(response.status).toBe(403);
    });

    it('should return 404 if community does not exist', async () => {
         const response = await request(app)
            .get(`/communities/99999/proposals`)
            .set('Authorization', `Bearer ${token1}`);
        expect(response.status).toBe(404);
    });
  });

  // --- GET /proposals/:id --- 
  describe('GET /proposals/:id', () => {
    let proposal1: Proposal;

    beforeEach(async () => {
        const deadline = new Date(); deadline.setDate(deadline.getDate() + 1);
        proposal1 = await createTestProposal(community1.id, user1.id, 'Get Me Prop', deadline);
        await prisma.vote.create({ data: { proposalId: proposal1.id, voterId: user1.id, voteType: 'For' } });
    });

    it('should return proposal details if user is a member of the community', async () => {
        const response = await request(app)
            .get(`/proposals/${proposal1.id}`)
            .set('Authorization', `Bearer ${token1}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(proposal1.id);
        expect(response.body.title).toBe('Get Me Prop');
        expect(response.body.communityId).toBe(community1.id);
        expect(response.body.votes).toHaveLength(1);
    });

     it('should return 403 if user is not a member of the community', async () => {
        const { token: token4 } = await createUserAndGetToken('user4b@proposal.test', 'Outsider B');
        const response = await request(app)
            .get(`/proposals/${proposal1.id}`)
            .set('Authorization', `Bearer ${token4}`);
        expect(response.status).toBe(403);
     });

      it('should return 404 if proposal does not exist', async () => {
        const response = await request(app)
            .get(`/proposals/99999`)
            .set('Authorization', `Bearer ${token1}`);
        expect(response.status).toBe(404);
      });
  });

  // --- POST /proposals/:id/vote --- 
  describe('POST /proposals/:id/vote', () => {
    let proposal1: Proposal;

    beforeEach(async () => {
        const deadline = new Date(); deadline.setDate(deadline.getDate() + 7);
        // Create proposal with 50% quorum, user1 already voted For via createProposalAndVote service
        const created = await proposalService.createProposalAndVote({
            title: 'Vote Test Prop',
            deadline: deadline,
            communityId: community1.id,
            initiatorId: user1.id,
            tags: [],
            quorumPct: 50 // Community has 3 members, 50% = 2 votes needed for quorum
        });
        // Fetch the full proposal object after creation
        proposal1 = await prisma.proposal.findUniqueOrThrow({ where: {id: created.id }});
    });

    it('should record a vote for a user', async () => {
      const response = await request(app)
        .post(`/proposals/${proposal1.id}/vote`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ voteType: 'Against' });

      expect(response.status).toBe(200);
      expect(response.body.proposal.status).toBe('Active'); // Quorum met (2/3 > 50%), but tie (1 For, 1 Against)
      expect(response.body.voteCounts).toEqual({ For: 1, Against: 1, Neutral: 0 });

      // Verify vote in DB
      const dbVote = await prisma.vote.findUnique({ where: { proposalId_voterId: { proposalId: proposal1.id, voterId: user2.id } } });
      expect(dbVote).not.toBeNull();
      expect(dbVote?.voteType).toBe('Against');
    });

    it('should update an existing vote for a user', async () => {
       // User 2 votes Against first
       await request(app)
           .post(`/proposals/${proposal1.id}/vote`)
           .set('Authorization', `Bearer ${token2}`)
           .send({ voteType: 'Against' });

       // User 2 changes vote to For
       const response = await request(app)
           .post(`/proposals/${proposal1.id}/vote`)
           .set('Authorization', `Bearer ${token2}`)
           .send({ voteType: 'For' });

       expect(response.status).toBe(200);
       expect(response.body.proposal.status).toBe('Approved'); // Quorum met (2/3 > 50%), For wins (2 For, 0 Against)
       expect(response.body.voteCounts).toEqual({ For: 2, Against: 0, Neutral: 0 });

       const dbVote = await prisma.vote.findUnique({ where: { proposalId_voterId: { proposalId: proposal1.id, voterId: user2.id } } });
       expect(dbVote?.voteType).toBe('For');
    });

    it('should approve proposal when quorum and majority are met', async () => {
        // User 2 votes For (User 1 already voted For)
        const response = await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ voteType: 'For' });

        expect(response.status).toBe(200);
        expect(response.body.proposal.status).toBe('Approved');
        expect(response.body.voteCounts).toEqual({ For: 2, Against: 0, Neutral: 0 });
    });

    it('should reject proposal when quorum and majority are met', async () => {
        // User 2 and 3 vote Against (User 1 voted For)
        await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ voteType: 'Against' });
        const response = await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token3}`)
            .send({ voteType: 'Against' });

        expect(response.status).toBe(200);
        expect(response.body.proposal.status).toBe('Rejected'); // Quorum met (3/3 > 50%), Against wins (1 For, 2 Against)
        expect(response.body.voteCounts).toEqual({ For: 1, Against: 2, Neutral: 0 });
    });

    it('should approve early if insurmountable For majority reached', async () => {
        // Need 2 votes For to win in 3-person community (50% quorum)
        // User 1 already voted For.
        // User 2 votes For.
        const response = await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ voteType: 'For' });

        expect(response.status).toBe(200);
        // Early close check: 2 For > 0 Against + 1 remaining + 0 Neutral -> 2 > 1 -> Approved
        expect(response.body.proposal.status).toBe('Approved');
        expect(response.body.voteCounts).toEqual({ For: 2, Against: 0, Neutral: 0 });
    });

     it('should reject early if insurmountable Against majority reached', async () => {
        // User 2 votes Against.
        await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ voteType: 'Against' });
        // User 3 votes Against.
        const response = await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token3}`)
            .send({ voteType: 'Against' });

        expect(response.status).toBe(200);
        // Early close check: 2 Against > 1 For + 0 remaining + 0 Neutral -> 2 > 1 -> Rejected
        expect(response.body.proposal.status).toBe('Rejected');
        expect(response.body.voteCounts).toEqual({ For: 1, Against: 2, Neutral: 0 });
    });

    it('should return 403 if user is not a member', async () => {
        const { token: token4 } = await createUserAndGetToken('user4c@proposal.test', 'Outsider C');
        const response = await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token4}`)
            .send({ voteType: 'For' });
        expect(response.status).toBe(403);
    });

    it('should return 403 if voting on non-active proposal', async () => {
        // Manually set proposal to Approved
        await prisma.proposal.update({ where: { id: proposal1.id }, data: { status: 'Approved' } });
        const response = await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ voteType: 'Neutral' });
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('not active for voting');
    });

    it('should return 400 for invalid voteType', async () => {
         const response = await request(app)
            .post(`/proposals/${proposal1.id}/vote`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ voteType: 'Maybe' });
        expect(response.status).toBe(400);
    });
  });
}); 