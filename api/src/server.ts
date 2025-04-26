import express, { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors';

// Load the OpenAPI document
const openapiDocument = YAML.load('./openapi.yaml');

import authRoutes from './modules/auth/routes'; // Import auth routes
import communityRoutes from './modules/community/routes'; // Import community routes
// Import proposal routers
import { communityProposalsRouter, proposalSpecificRouter } from './modules/proposal/routes';
// Import event routers
import { communityEventsRouter, singleEventRouter } from './modules/event/routes';
// Import note routers
import { communityNotesRouter, singleNoteRouter } from './modules/note/routes';
// Import chat routes
import chatRoutes from './modules/chat/routes';

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
// Mount community-specific event routes under /communities/:communityId/events
communityRoutes.use('/:communityId/events', communityEventsRouter);
// Mount community-specific note routes under /communities/:communityId/notes
communityRoutes.use('/:communityId/notes', communityNotesRouter);
// Mount chat routes
app.use(chatRoutes); // Mount chat routes under the root
app.use('/communities', communityRoutes);
// Mount proposal-specific routes under /proposals
app.use('/proposals', proposalSpecificRouter);
// Mount event-specific routes under /events
app.use('/events', singleEventRouter);
// Mount note-specific routes under /notes
app.use('/notes', singleNoteRouter);
// Serve Swagger UI at /docs
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, {
    explorer: true,         // show the "Explore" bar
    swaggerOptions: {
      persistAuthorization: true  // keeps your JWT bearer filled in
    }
  })
);

const PORT = process.env.PORT || 3001;

// Conditional server start (prevents listening during tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server]: Server is running at http://localhost:${PORT}`);
  });
} 