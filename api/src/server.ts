import express, { Express, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './modules/auth/routes'; // Import auth routes
import communityRoutes from './modules/community/routes'; // Import community routes
// Import proposal routers
import { communityProposalsRouter, proposalSpecificRouter } from './modules/proposal/routes';

dotenv.config();

export const prisma = new PrismaClient();
export const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/auth', authRoutes); // Use auth routes
// Mount community-specific proposal routes under /communities/:communityId/proposals
communityRoutes.use('/:communityId/proposals', communityProposalsRouter);
app.use('/communities', communityRoutes);
// Mount proposal-specific routes under /proposals
app.use('/proposals', proposalSpecificRouter);

const PORT = process.env.PORT || 3001;

// Conditional server start (prevents listening during tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
  });
} 