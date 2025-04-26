import { Request, Response } from 'express';
import * as communityService from '../services/communityService';

export const createCommunity = async (req: Request, res: Response): Promise<void> => {
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
    const community = await communityService.createCommunityWithAdmin(
      { name, description, imageUrl },
      userId
    );
    res.status(201).json(community);
  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({ message: 'Internal server error creating community' });
  }
};

export const listCommunities = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized: User ID not found' });
    return;
  }

  try {
    const communities = await communityService.findCommunitiesByUserId(userId);
    res.status(200).json(communities);
  } catch (error) {
    console.error('Error listing communities:', error);
    res.status(500).json({ message: 'Internal server error listing communities' });
  }
};

export const getCommunity = async (req: Request, res: Response): Promise<void> => {
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
      } else {
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

  } catch (error) {
    console.error('Error getting community:', error);
    res.status(500).json({ message: 'Internal server error getting community' });
  }
};

export const updateCommunity = async (req: Request, res: Response): Promise<void> => {
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
    const updateData: Partial<{ name: string; description: string | null; imageUrl: string | null }> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const updatedCommunity = await communityService.updateCommunityDetails(communityId, updateData);
    res.status(200).json(updatedCommunity);

  } catch (error) {
     console.error('Error updating community:', error);
     // Handle Prisma P2025 record not found error - should theoretically be caught by existence check now
     if ((error as any).code === 'P2025') {
        res.status(404).json({ message: 'Community not found during update' });
     } else {
        res.status(500).json({ message: 'Internal server error updating community' });
     }
  }
};

export const deleteCommunity = async (req: Request, res: Response): Promise<void> => {
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

  } catch (error) {
    console.error('Error deleting community:', error);
    // Handle Prisma P2025 record not found error - should theoretically be caught by existence check now
    if ((error as any).code === 'P2025') {
        res.status(404).json({ message: 'Community not found during delete' });
    } else {
        res.status(500).json({ message: 'Internal server error deleting community' });
    }
  }
};

// --- Membership Controllers ---

export const addMember = async (req: Request, res: Response): Promise<void> => {
    const communityId = parseInt(req.params.communityId, 10);
    const memberUserId = parseInt(req.body.userId, 10); // Get user ID from request body
    const requestingUserId = req.user?.userId;

    // Authorization already checked by authorizeAdmin middleware
    // Basic validation
    if (isNaN(memberUserId)) {
        res.status(400).json({ message: 'Invalid user ID in request body' });
        return;
    }
    if (memberUserId === requestingUserId) {
        res.status(400).json({ message: 'Cannot add yourself as a member' });
        return;
    }

    try {
        const newMembership = await communityService.addMemberToCommunity(communityId, memberUserId);
        res.status(201).json(newMembership);
    } catch (error: any) {
        // Only log unexpected errors
        if (error.code === 'P2002') { // Prisma unique constraint violation (already a member)
            res.status(409).json({ message: 'User is already a member of this community' });
        } else if (error.message.includes('does not exist')) {
             res.status(404).json({ message: error.message }); // User or Community not found
        } else {
            // Log other errors
            console.error('Error adding member:', error);
            res.status(500).json({ message: 'Internal server error adding member' });
        }
    }
};

export const removeMember = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error: any) {
         // Only log unexpected errors
         if (error.code === 'P2025') { // Prisma record not found
             res.status(404).json({ message: 'Membership not found for this user/community' });
         } else if (error.message.includes('Cannot remove the community creator')) {
             res.status(400).json({ message: error.message });
         } else {
            // Log other errors
             console.error('Error removing member:', error);
             res.status(500).json({ message: 'Internal server error removing member' });
         }
    }
};

export const listMembers = async (req: Request, res: Response): Promise<void> => {
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
            } else {
                res.status(403).json({ message: 'Forbidden: User is not a member of this community' });
            }
            return;
        }

        const members = await communityService.findCommunityMembers(communityId);
        res.status(200).json(members);
    } catch (error) {
        console.error('Error listing members:', error);
        res.status(500).json({ message: 'Internal server error listing members' });
    }
}; 