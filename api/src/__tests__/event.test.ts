import request from 'supertest';
import { app, prisma } from '../server';
import * as authService from '../modules/auth/services/authService';
import * as proposalService from '../modules/proposal/services/proposalService';
import { User, Community, Proposal, Event } from '@prisma/client';

// Helper function from previous tests
const createUserAndGetToken = async (
  email: string,
  name: string,
  password = 'password123'
): Promise<{ user: User; token: string }> => {
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        const token = authService.generateToken(user.id);
        return { user, token };
    }
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

describe('Event API', () => {
  let user1: User, user2: User;
  let token1: string, token2: string;
  let community1: Community;
  let approvedProposal: Proposal;
  let event1: Event;

  beforeAll(async () => {
    // Clear database
    await prisma.event.deleteMany({});
    await prisma.vote.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.membership.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.user.deleteMany({});

    // Create users
    const u1 = await createUserAndGetToken('user1@event.test', 'Event User 1');
    user1 = u1.user; token1 = u1.token;
    const u2 = await createUserAndGetToken('user2@event.test', 'Event User 2');
    user2 = u2.user; token2 = u2.token;

    // Create community and add user2 as member
    community1 = await createTestCommunity(user1.id, 'Event Community');
    await prisma.membership.create({
        data: { communityId: community1.id, userId: user2.id, role: 'Member' },
    });

    // Create an approved proposal that should generate an event
    const deadline = new Date(); deadline.setDate(deadline.getDate() + 1);
    const proposalData = {
        title: 'Approved Event Proposal',
        dateTime: new Date(), // Set a dateTime for the event
        deadline: deadline,
        communityId: community1.id,
        initiatorId: user1.id,
        tags: [],
        quorumPct: 0, // Ensure easy approval
    };
    const createdProposal = await proposalService.createProposalAndVote(proposalData);
    // Vote 'For' by user2 to trigger approval
    await proposalService.recordOrUpdateVote({ proposalId: createdProposal.id, voterId: user2.id, voteType: 'For'});
    
    // Verify proposal is approved and fetch the resulting event
    approvedProposal = await prisma.proposal.findUniqueOrThrow({ where: { id: createdProposal.id }});
    expect(approvedProposal.status).toBe('Approved');
    event1 = await prisma.event.findUniqueOrThrow({ where: { proposalId: approvedProposal.id }});
    expect(event1).toBeDefined();
    expect(event1.title).toBe(approvedProposal.title);
  });

  afterAll(async () => {
    await prisma.event.deleteMany({});
    await prisma.vote.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.membership.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  // Test Event Creation Trigger
  describe('Proposal Approval Event Creation', () => {
      it('should create an Event when a Proposal with dateTime is Approved', () => {
          // Verification is done in beforeAll
          expect(event1).toBeDefined();
          expect(event1.proposalId).toBe(approvedProposal.id);
          expect(event1.communityId).toBe(community1.id);
          expect(event1.title).toBe(approvedProposal.title);
          expect(event1.dateTime).toEqual(approvedProposal.dateTime);
          expect(event1.location).toEqual(approvedProposal.location);
      });

      it('should NOT create an Event if approved Proposal lacks dateTime', async () => {
           const deadline = new Date(); deadline.setDate(deadline.getDate() + 1);
           const noDateProposalData = {
               title: 'Approved No Date Proposal',
               dateTime: undefined, // No date time
               deadline: deadline,
               communityId: community1.id,
               initiatorId: user1.id,
               tags: [],
               quorumPct: 0,
           };
           const created = await proposalService.createProposalAndVote(noDateProposalData);
           await proposalService.recordOrUpdateVote({ proposalId: created.id, voterId: user2.id, voteType: 'For'});
           
           const eventExists = await prisma.event.findUnique({ where: { proposalId: created.id }});
           expect(eventExists).toBeNull();
       });
  });

  // --- GET /communities/:communityId/events --- 
  describe('GET /communities/:communityId/events', () => {
    it('should list all events for a community member', async () => {
      const response = await request(app)
        .get(`/communities/${community1.id}/events`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(event1.id);
      expect(response.body[0].proposalId).toBe(approvedProposal.id);
    });

    it('should return 403 if user is not a member', async () => {
        const { token: token3 } = await createUserAndGetToken('user3@event.test', 'Event Outsider');
        const response = await request(app)
            .get(`/communities/${community1.id}/events`)
            .set('Authorization', `Bearer ${token3}`);
        expect(response.status).toBe(403);
    });

    it('should return 404 if community does not exist', async () => {
        const response = await request(app)
            .get(`/communities/99999/events`)
            .set('Authorization', `Bearer ${token1}`);
        expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
        const response = await request(app).get(`/communities/${community1.id}/events`);
        expect(response.status).toBe(401);
    });
  });

  // --- GET /events/:id/ics --- 
  describe('GET /events/:id/ics', () => {
    it('should return an ICS file for a valid event if user is a member', async () => {
      const response = await request(app)
        .get(`/events/${event1.id}/ics`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toEqual('text/calendar; charset=utf-8');
      expect(response.headers['content-disposition']).toEqual(`attachment; filename="event-${event1.id}.ics"`);
      // Basic ICS content checks
      expect(response.text).toContain('BEGIN:VCALENDAR');
      expect(response.text).toContain('BEGIN:VEVENT');
      expect(response.text).toContain(`SUMMARY:${event1.title}`);
      expect(response.text).toContain('END:VEVENT');
      expect(response.text).toContain('END:VCALENDAR');
    });

    it('should return 403 if user is not a member of the event community', async () => {
        const { token: token3 } = await createUserAndGetToken('user3b@event.test', 'Event Outsider B');
        const response = await request(app)
            .get(`/events/${event1.id}/ics`)
            .set('Authorization', `Bearer ${token3}`);
        expect(response.status).toBe(403);
    });

    it('should return 404 if event does not exist', async () => {
        const response = await request(app)
            .get(`/events/99999/ics`)
            .set('Authorization', `Bearer ${token1}`);
        expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
        const response = await request(app).get(`/events/${event1.id}/ics`);
        expect(response.status).toBe(401);
    });
  });
}); 