"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommunityAndMemberships = exports.updateCommunityDetails = exports.isUserAdmin = exports.isUserMember = exports.findCommunityById = exports.findCommunitiesByUserId = exports.createCommunityWithAdmin = void 0;
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
//# sourceMappingURL=communityService.js.map