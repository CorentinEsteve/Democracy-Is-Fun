import { Prisma, Community, Membership, User } from '@prisma/client';
import { prisma } from '../../../server'; // Adjust path if necessary

type CommunityWithMembers = Community & {
    memberships: (Membership & { user: Pick<User, 'id' | 'name' | 'avatarUrl'> })[];
};

export const createCommunityWithAdmin = async (
  data: Pick<Community, 'name' | 'description' | 'imageUrl'>,
  creatorId: number
): Promise<CommunityWithMembers> => {
  return prisma.$transaction(async (tx) => {
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

export const findCommunitiesByUserId = async (
  userId: number
): Promise<Community[]> => {
  return prisma.community.findMany({
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

export const findCommunityById = async (
  communityId: number
): Promise<CommunityWithMembers | null> => {
  return prisma.community.findUnique({
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

export const isUserMember = async (
  userId: number,
  communityId: number
): Promise<boolean> => {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: { userId, communityId },
    },
  });
  return !!membership;
};

export const isUserAdmin = async (
  userId: number,
  communityId: number
): Promise<boolean> => {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: { userId, communityId },
    },
  });
  return membership?.role === 'Admin';
};

export const updateCommunityDetails = async (
  communityId: number,
  data: Partial<Pick<Community, 'name' | 'description' | 'imageUrl'>>
): Promise<Community> => {
  return prisma.community.update({
    where: { id: communityId },
    data: data,
  });
};

export const deleteCommunityAndMemberships = async (
  communityId: number
): Promise<void> => {
  // Use a transaction to ensure all related data is deleted before the community
  await prisma.$transaction(async (tx) => {
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