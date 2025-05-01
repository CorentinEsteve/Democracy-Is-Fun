"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const communityController = __importStar(require("./controllers/communityController"));
const authenticate_1 = require("../../middleware/authenticate"); // Import middleware
const authorizeAdmin_1 = require("../../middleware/authorizeAdmin"); // Import admin auth middleware
const router = (0, express_1.Router)();
// Community Level Routes (require auth)
router.post('/', authenticate_1.authenticate, communityController.createCommunity);
router.get('/', authenticate_1.authenticate, communityController.listCommunities);
// Specific Community Routes (require auth, sometimes admin)
router.get('/:communityId', authenticate_1.authenticate, communityController.getCommunity);
router.patch('/:communityId', authenticate_1.authenticate, authorizeAdmin_1.authorizeAdmin, communityController.updateCommunity);
router.delete('/:communityId', authenticate_1.authenticate, authorizeAdmin_1.authorizeAdmin, communityController.deleteCommunity);
// Membership Routes within a Community
router.get('/:communityId/members', authenticate_1.authenticate, communityController.listMembers);
router.post('/:communityId/members', authenticate_1.authenticate, authorizeAdmin_1.authorizeAdmin, communityController.addMember);
router.delete('/:communityId/members/:userId', authenticate_1.authenticate, authorizeAdmin_1.authorizeAdmin, communityController.removeMember);
router.patch('/:communityId/members/:userId', authenticate_1.authenticate, authorizeAdmin_1.authorizeAdmin, communityController.updateMemberRole);
exports.default = router;
//# sourceMappingURL=routes.js.map