"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./modules/auth/routes")); // Import auth routes
const routes_2 = __importDefault(require("./modules/community/routes")); // Import community routes
// Import proposal routers
const routes_3 = require("./modules/proposal/routes");
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
exports.app.use('/communities', routes_2.default);
// Mount proposal-specific routes under /proposals
exports.app.use('/proposals', routes_3.proposalSpecificRouter);
const PORT = process.env.PORT || 3001;
// Conditional server start (prevents listening during tests)
if (process.env.NODE_ENV !== 'test') {
    exports.app.listen(PORT, () => {
        console.log(`[server]: Server is running at http://localhost:${PORT}`);
    });
}
//# sourceMappingURL=server.js.map