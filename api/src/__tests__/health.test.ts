import request from 'supertest';
import { app, prisma } from '../server'; // Adjust path as needed

// Ensure Prisma disconnects after tests
afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /health', () => {
  it('should respond with status 200 and { status: "ok" }', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
}); 