"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
// Load the OpenAPI document
const openapiDocument = yamljs_1.default.load('./openapi.yaml');
const routes_1 = __importDefault(require("./modules/auth/routes")); // Import auth routes
const routes_2 = __importDefault(require("./modules/community/routes")); // Import community routes
// Import proposal routers
const routes_3 = require("./modules/proposal/routes");
// Import event routers
const routes_4 = require("./modules/event/routes");
// Import note routers
const routes_5 = require("./modules/note/routes");
// Import chat routes
const routes_6 = __importDefault(require("./modules/chat/routes"));
dotenv_1.default.config();
exports.prisma = new client_1.PrismaClient();
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// API Routes
exports.app.use('/auth', routes_1.default); // Use auth routes
// Mount community-specific proposal routes under /communities/:communityId/proposals
routes_2.default.use('/:communityId/proposals', routes_3.communityProposalsRouter);
// Mount community-specific event routes under /communities/:communityId/events
routes_2.default.use('/:communityId/events', routes_4.communityEventsRouter);
// Mount community-specific note routes under /communities/:communityId/notes
routes_2.default.use('/:communityId/notes', routes_5.communityNotesRouter);
// Mount chat routes
exports.app.use(routes_6.default); // Mount chat routes under the root
exports.app.use('/communities', routes_2.default);
// Mount proposal-specific routes under /proposals
exports.app.use('/proposals', routes_3.proposalSpecificRouter);
// Mount event-specific routes under /events
exports.app.use('/events', routes_4.singleEventRouter);
// Mount note-specific routes under /notes
exports.app.use('/notes', routes_5.singleNoteRouter);
// Serve Swagger UI at /docs
exports.app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapiDocument, {
    explorer: true, // show the "Explore" bar
    swaggerOptions: {
        persistAuthorization: true // keeps your JWT bearer filled in
    }
}));
const PORT = process.env.PORT || 3001;
// Conditional server start (prevents listening during tests)
if (process.env.NODE_ENV !== 'test') {
    exports.app.listen(PORT, () => {
        console.log(`[server]: Server is running at http://localhost:${PORT}`);
    });
}
//# sourceMappingURL=server.js.map