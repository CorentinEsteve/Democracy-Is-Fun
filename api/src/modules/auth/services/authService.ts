import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { prisma } from '../../../server'; // Adjust path if necessary

// TODO: Move JWT_SECRET to .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key'; // Use a strong secret in production!
const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  plainTextPassword: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(plainTextPassword, hash);
};

export const generateToken = (userId: number): string => {
  const payload = { userId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }); // Token expires in 1 day
};

export const createUser = async (
  data: Pick<User, 'email' | 'name'> & { passwordHash: string }
): Promise<User> => {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash, // Assuming you add this field to your User model
    },
  });
};

export const findUserByEmail = async (
  email: string
): Promise<User | null> => {
  return prisma.user.findUnique({ where: { email } });
}; 