import { Request, Response, NextFunction } from 'express';
import { isUserAdmin, findCommunityById } from '../modules/community/services/communityService'; // Import findCommunityById

export const authorizeAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  const communityId = parseInt(req.params.communityId, 10); // Assumes communityId is in route params

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found' });
  }
  if (isNaN(communityId)) {
    console.error('authorizeAdmin middleware called on route without valid communityId param');
    return res.status(400).json({ message: 'Invalid community ID' }); // Return 400 for invalid ID
  }

  try {
    // 1. Check if community exists first
    const communityExists = await findCommunityById(communityId);
    if (!communityExists) {
        // Let the controller handle the 404, just call next()
        // Alternatively, could return 404 here: return res.status(404).json({ message: 'Community not found' });
        return next(); 
    }

    // 2. If community exists, check if user is admin
    const isAdmin = await isUserAdmin(userId, communityId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Forbidden: User is not an admin of this community' });
    }

    next(); // User is admin, proceed
    
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ message: 'Internal server error during authorization' });
  }
}; 