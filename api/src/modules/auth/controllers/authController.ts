import { Request, Response } from 'express';
import * as authService from '../services/authService';

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ message: 'Email, password, and name are required' });
    return;
  }

  try {
    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ message: 'Email already exists' });
      return;
    }

    const passwordHash = await authService.hashPassword(password);
    const user = await authService.createUser({ email, name, passwordHash });
    const token = authService.generateToken(user.id);

    // Omit passwordHash from the response
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error during signup' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    const user = await authService.findUserByEmail(email);
    if (!user || !user.passwordHash) { // Check if user exists and has a password
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isPasswordValid = await authService.comparePassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = authService.generateToken(user.id);

    // Omit passwordHash from the response
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
}; 