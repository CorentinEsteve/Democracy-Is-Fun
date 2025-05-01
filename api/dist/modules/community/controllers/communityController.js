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
exports.listMembers = exports.updateMemberRole = exports.removeMember = exports.addMember = exports.deleteCommunity = exports.updateCommunity = exports.getCommunity = exports.listCommunities = exports.createCommunity = void 0;
const communityService = __importStar(require("../services/communityService"));
const createCommunity = async (req, res) => {
    const { name, description, imageUrl } = req.body;
    const userId = req.user?.userId; // Provided by authenticate middleware
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User ID not found' });
        return;
    }
    if (!name) {
        res.status(400).json({ message: 'Community name is required' });
        return;
    }
    try {
        const community = await communityService.createCommunityWithAdmin({ name, description, imageUrl }, userId);
        res.status(201).json(community);
    }
    catch (error) {
        console.error('Error creating community:', error);
        res.status(500).json({ message: 'Internal server error creating community' });
    }
};
exports.createCommunity = createCommunity;
const listCommunities = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User ID not found' });
        return;
    }
    try {
        const communities = await communityService.findCommunitiesByUserId(userId);
        res.status(200).json(communities);
    }
    catch (error) {
        console.error('Error listing communities:', error);
        res.status(500).json({ message: 'Internal server error listing communities' });
    }
};
exports.listCommunities = listCommunities;
const getCommunity = async (req, res) => {
    const communityId = parseInt(req.params.communityId, 10);
    const userId = req.user?.userId;
    if (isNaN(communityId)) {
        res.status(400).json({ message: 'Invalid community ID' });
        return;
    }
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User ID not found' });
        return;
    }
    try {
        const isMember = await communityService.isUserMember(userId, communityId);
        if (!isMember) {
            // Check if community exists before returning 403 vs 404
            const communityExists = await communityService.findCommunityById(communityId);
            if (!communityExists) {
                res.status(404).json({ message: 'Community not found' });
            }
            else {
                res.status(403).json({ message: 'Forbidden: User is not a member of this community' });
            }
            return;
        }
        const community = await communityService.findCommunityById(communityId);
        // Should always exist if isMember is true, but check just in case
        if (!community) {
            res.status(404).json({ message: 'Community not found despite membership check' });
            return;
        }
        res.status(200).json(community);
    }
    catch (error) {
        console.error('Error getting community:', error);
        res.status(500).json({ message: 'Internal server error getting community' });
    }
};
exports.getCommunity = getCommunity;
const updateCommunity = async (req, res) => {
    const communityId = parseInt(req.params.communityId, 10);
    const userId = req.user?.userId;
    const { name, description, imageUrl } = req.body;
    if (isNaN(communityId)) {
        res.status(400).json({ message: 'Invalid community ID' });
        return;
    }
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User ID not found' });
        return;
    }
    if (!name && !description && imageUrl === undefined) {
        res.status(400).json({ message: 'No update data provided' });
        return;
    }
    try {
        // Check community existence first
        const communityExists = await communityService.findCommunityById(communityId);
        if (!communityExists) {
            res.status(404).json({ message: 'Community not found' });
            return;
        }
        // Now check admin permissions
        const isAdmin = await communityService.isUserAdmin(userId, communityId);
        if (!isAdmin) {
            res.status(403).json({ message: 'Forbidden: User is not an admin of this community' });
            return;
        }
        // Filter out undefined fields
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (imageUrl !== undefined)
            updateData.imageUrl = imageUrl;
        const updatedCommunity = await communityService.updateCommunityDetails(communityId, updateData);
        res.status(200).json(updatedCommunity);
    }
    catch (error) {
        console.error('Error updating community:', error);
        // Handle Prisma P2025 record not found error - should theoretically be caught by existence check now
        if (error.code === 'P2025') {
            res.status(404).json({ message: 'Community not found during update' });
        }
        else {
            res.status(500).json({ message: 'Internal server error updating community' });
        }
    }
};
exports.updateCommunity = updateCommunity;
const deleteCommunity = async (req, res) => {
    const communityId = parseInt(req.params.communityId, 10);
    const userId = req.user?.userId;
    if (isNaN(communityId)) {
        res.status(400).json({ message: 'Invalid community ID' });
        return;
    }
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User ID not found' });
        return;
    }
    try {
        // Check community existence first
        const communityExists = await communityService.findCommunityById(communityId);
        if (!communityExists) {
            res.status(404).json({ message: 'Community not found' });
            return;
        }
        // Now check admin permissions
        const isAdmin = await communityService.isUserAdmin(userId, communityId);
        if (!isAdmin) {
            res.status(403).json({ message: 'Forbidden: User is not an admin of this community' });
            return;
        }
        await communityService.deleteCommunityAndMemberships(communityId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting community:', error);
        // Handle Prisma P2025 record not found error - should theoretically be caught by existence check now
        if (error.code === 'P2025') {
            res.status(404).json({ message: 'Community not found during delete' });
        }
        else {
            res.status(500).json({ message: 'Internal server error deleting community' });
        }
    }
};
exports.deleteCommunity = deleteCommunity;
// --- Membership Controllers ---
const addMember = async (req, res) => {
    const communityId = parseInt(req.params.communityId, 10);
    // const memberUserId = parseInt(req.body.userId, 10); // Old way: Expecting numeric userId
    const { userIdentifier } = req.body; // New way: Expecting string userIdentifier
    const requestingUserId = req.user?.userId;
    // Authorization already checked by authorizeAdmin middleware
    // Basic validation
    if (!userIdentifier) { // Check if identifier is provided
        res.status(400).json({ message: 'User identifier (ID or email) is required in request body' });
        return;
    }
    // if (isNaN(memberUserId)) { // Remove old check
    //     res.status(400).json({ message: 'Invalid user ID in request body' });
    //     return;
    // }
    // We will need to find the user by identifier in the service layer.
    // A check to prevent adding oneself might still be needed after finding the user ID.
    // if (memberUserId === requestingUserId) {
    //     res.status(400).json({ message: 'Cannot add yourself as a member' });
    //     return;
    // }
    try {
        const newMembership = await communityService.addMemberByIdentifier(communityId, userIdentifier, requestingUserId // Pass requesting user ID for self-add check in service
        );
        res.status(201).json(newMembership);
    }
    catch (error) {
        console.error('Error adding member:', error);
        if (error.message.includes('User not found') || error.message.includes('Community not found')) {
            res.status(404).json({ message: error.message });
        }
        else if (error.message.includes('already a member')) {
            res.status(409).json({ message: error.message }); // Conflict
        }
        else if (error.message.includes('Cannot add yourself')) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Internal server error adding member' });
        }
    }
};
exports.addMember = addMember;
const removeMember = async (req, res) => {
    const communityId = parseInt(req.params.communityId, 10);
    const memberUserIdToRemove = parseInt(req.params.userId, 10);
    // Authorization already checked by authorizeAdmin middleware
    // Basic validation
    if (isNaN(memberUserIdToRemove)) {
        res.status(400).json({ message: 'Invalid user ID in route parameter' });
        return;
    }
    try {
        await communityService.removeMemberFromCommunity(communityId, memberUserIdToRemove);
        res.status(204).send();
    }
    catch (error) {
        // Only log unexpected errors
        if (error.code === 'P2025') { // Prisma record not found
            res.status(404).json({ message: 'Membership not found for this user/community' });
        }
        else if (error.message.includes('Cannot remove the community creator')) {
            res.status(400).json({ message: error.message });
        }
        else {
            // Log other errors
            console.error('Error removing member:', error);
            res.status(500).json({ message: 'Internal server error removing member' });
        }
    }
};
exports.removeMember = removeMember;
// New controller for updating member role
const updateMemberRole = async (req, res) => {
    const communityId = parseInt(req.params.communityId, 10);
    const memberUserIdToUpdate = parseInt(req.params.userId, 10);
    const { role: newRole } = req.body; // Expect role as string ('Admin' or 'Member')
    // Authorization already checked by authorizeAdmin middleware
    // Basic validation
    if (isNaN(memberUserIdToUpdate)) {
        res.status(400).json({ message: 'Invalid user ID in route parameter' });
        return;
    }
    if (typeof newRole !== 'string' || (newRole !== 'Admin' && newRole !== 'Member')) {
        res.status(400).json({ message: 'Invalid role specified in request body. Must be "Admin" or "Member".' });
        return;
    }
    try {
        const updatedMembership = await communityService.updateMemberRoleInCommunity(communityId, memberUserIdToUpdate, newRole // Pass the validated string role
        );
        res.status(200).json(updatedMembership);
    }
    catch (error) {
        console.error('Error updating member role:', error);
        if (error.message.includes('not found')) {
            res.status(404).json({ message: error.message });
        }
        else if (error.message.includes('Cannot change the role')) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Internal server error updating member role' });
        }
    }
};
exports.updateMemberRole = updateMemberRole;
const listMembers = async (req, res) => {
    const communityId = parseInt(req.params.communityId, 10);
    const userId = req.user?.userId; // From authenticate middleware
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    if (isNaN(communityId)) {
        res.status(400).json({ message: 'Invalid community ID' });
        return;
    }
    try {
        // Check if requesting user is a member
        const isMember = await communityService.isUserMember(userId, communityId);
        if (!isMember) {
            const communityExists = await communityService.findCommunityById(communityId);
            if (!communityExists) {
                res.status(404).json({ message: 'Community not found' });
            }
            else {
                res.status(403).json({ message: 'Forbidden: User is not a member of this community' });
            }
            return;
        }
        const members = await communityService.findCommunityMembers(communityId);
        res.status(200).json(members);
    }
    catch (error) {
        console.error('Error listing members:', error);
        res.status(500).json({ message: 'Internal server error listing members' });
    }
};
exports.listMembers = listMembers;
//# sourceMappingURL=communityController.js.map