"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeMemberFromCommunity = exports.addMemberToCommunity = exports.findCommunityMembers = exports.deleteCommunityAndMemberships = exports.updateCommunityDetails = exports.isUserAdmin = exports.isUserMember = exports.findCommunityById = exports.findCommunitiesByUserId = exports.createCommunityWithAdmin = void 0;
const server_1 = require("../../../server"); // Adjust path if necessary
const createCommunityWithAdmin = async (data, creatorId) => {
    return server_1.prisma.$transaction(async (tx) => {
        const community = await tx.community.create({
            data: {
                name: data.name,
                description: data.description,
                imageUrl: data.imageUrl,
                creatorId: creatorId,
            },
        });
        await tx.membership.create({
            data: {
                userId: creatorId,
                communityId: community.id,
                role: 'Admin', // Use String as defined in schema
            },
        });
        // Fetch the community again with members included
        const newCommunity = await tx.community.findUniqueOrThrow({
            where: { id: community.id },
            include: {
                memberships: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatarUrl: true },
                        },
                    },
                },
            },
        });
        return newCommunity;
    });
};
exports.createCommunityWithAdmin = createCommunityWithAdmin;
const findCommunitiesByUserId = async (userId) => {
    return server_1.prisma.community.findMany({
        where: {
            memberships: {
                some: {
                    userId: userId,
                },
            },
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
};
exports.findCommunitiesByUserId = findCommunitiesByUserId;
const findCommunityById = async (communityId) => {
    return server_1.prisma.community.findUnique({
        where: { id: communityId },
        include: {
            memberships: {
                include: {
                    user: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                },
            },
        },
    });
};
exports.findCommunityById = findCommunityById;
const isUserMember = async (userId, communityId) => {
    const membership = await server_1.prisma.membership.findUnique({
        where: {
            userId_communityId: { userId, communityId },
        },
    });
    return !!membership;
};
exports.isUserMember = isUserMember;
const isUserAdmin = async (userId, communityId) => {
    const membership = await server_1.prisma.membership.findUnique({
        where: {
            userId_communityId: { userId, communityId },
        },
    });
    return membership?.role === 'Admin';
};
exports.isUserAdmin = isUserAdmin;
const updateCommunityDetails = async (communityId, data) => {
    return server_1.prisma.community.update({
        where: { id: communityId },
        data: data,
    });
};
exports.updateCommunityDetails = updateCommunityDetails;
const deleteCommunityAndMemberships = async (communityId) => {
    // Use a transaction to ensure all related data is deleted before the community
    await server_1.prisma.$transaction(async (tx) => {
        // Find proposals to delete related votes, oppositions, and events
        const proposals = await tx.proposal.findMany({
            where: { communityId },
            select: { id: true },
        });
        const proposalIds = proposals.map(p => p.id);
        if (proposalIds.length > 0) {
            // Delete votes associated with the community's proposals
            await tx.vote.deleteMany({ where: { proposalId: { in: proposalIds } } });
            // Delete oppositions (both ways)
            await tx.opposition.deleteMany({ where: { originalProposalId: { in: proposalIds } } });
            await tx.opposition.deleteMany({ where: { alternativeProposalId: { in: proposalIds } } });
            // Delete events associated with the community's proposals
            await tx.event.deleteMany({ where: { proposalId: { in: proposalIds } } });
            // Now delete the proposals themselves
            await tx.proposal.deleteMany({ where: { id: { in: proposalIds } } });
        }
        // Delete notes associated with the community
        await tx.note.deleteMany({ where: { communityId } });
        // Delete memberships associated with the community
        await tx.membership.deleteMany({ where: { communityId } });
        // Finally, delete the community itself
        await tx.community.delete({ where: { id: communityId } });
    });
};
exports.deleteCommunityAndMemberships = deleteCommunityAndMemberships;
const findCommunityMembers = async (communityId) => {
    return server_1.prisma.membership.findMany({
        where: { communityId },
        include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: {
            user: { name: 'asc' } // Order by member name
        }
    });
};
exports.findCommunityMembers = findCommunityMembers;
const addMemberToCommunity = async (communityId, userId) => {
    // Check if user exists (optional but good practice)
    const userExists = await server_1.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
        throw new Error('User to be added does not exist.');
    }
    // Check if community exists (optional)
    const communityExists = await server_1.prisma.community.findUnique({ where: { id: communityId } });
    if (!communityExists) {
        throw new Error('Community does not exist.');
    }
    // Create the membership (will throw P2002 if already exists)
    return server_1.prisma.membership.create({
        data: {
            userId,
            communityId,
            role: 'Member', // Default role
            points: 0, // Default points
        },
    });
};
exports.addMemberToCommunity = addMemberToCommunity;
const removeMemberFromCommunity = async (communityId, userId) => {
    // Check if user is the creator (cannot remove the creator)
    const community = await server_1.prisma.community.findUnique({ where: { id: communityId } });
    if (community?.creatorId === userId) {
        throw new Error('Cannot remove the community creator.');
    }
    // Delete the membership (will throw P2025 if not found)
    return server_1.prisma.membership.delete({
        where: {
            userId_communityId: { userId, communityId },
        },
    });
};
exports.removeMemberFromCommunity = removeMemberFromCommunity;
//# sourceMappingURL=communityService.js.map