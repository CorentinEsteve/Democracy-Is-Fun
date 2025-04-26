import request from 'supertest';
import { app, prisma } from '../server';

describe('Auth API', () => {
  // Clean up the database before each test
  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  // Clean up the database after all tests
  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  // --- Signup Tests --- 
  describe('POST /auth/signup', () => {
    it('should create a new user and return a token', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBeNull();
      expect(response.body.token).not.toBe('');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user).not.toHaveProperty('passwordHash'); // Ensure hash is not returned

      // Verify user was created in the database
      const dbUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(userData.email);
      expect(dbUser?.name).toBe(userData.name);
      expect(dbUser?.passwordHash).not.toBe(userData.password); // Ensure password is hashed
    });

    it('should return 409 if email already exists', async () => {
      // Create a user first
      const userData = {
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
      };
      await request(app).post('/auth/signup').send(userData);

      // Attempt to sign up again with the same email
      const response = await request(app)
        .post('/auth/signup')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Email already exists');
    });

    it('should return 400 if required fields are missing', async () => {
      const responses = await Promise.all([
        request(app).post('/auth/signup').send({ email: 'test@test.com', name: 'Test' }), // Missing password
        request(app).post('/auth/signup').send({ password: 'pass', name: 'Test' }), // Missing email
        request(app).post('/auth/signup').send({ email: 'test@test.com', password: 'pass' }), // Missing name
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Email, password, and name are required');
      });
    });
  });

  // --- Login Tests --- 
  describe('POST /auth/login', () => {
    const loginUser = {
      name: 'Login User',
      email: 'login@example.com',
      password: 'password123',
    };

    // Create a user to login with before login tests
    beforeEach(async () => {
        await request(app).post('/auth/signup').send(loginUser);
    });

    it('should login an existing user and return a token', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: loginUser.email, password: loginUser.password });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBeNull();
      expect(response.body.token).not.toBe('');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginUser.email);
      expect(response.body.user.name).toBe(loginUser.name);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: loginUser.email, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

     it('should return 400 if required fields are missing', async () => {
        const responses = await Promise.all([
          request(app).post('/auth/login').send({ email: 'test@test.com' }), // Missing password
          request(app).post('/auth/login').send({ password: 'pass' }), // Missing email
        ]);
    
        responses.forEach(response => {
          expect(response.status).toBe(400);
          expect(response.body.message).toBe('Email and password are required');
        });
      });
  });
}); 