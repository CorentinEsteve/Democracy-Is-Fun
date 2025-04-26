import { Request, Response } from 'express';
import * as eventService from '../services/eventService';
import * as communityService from '../../community/services/communityService';

export const listEvents = async (req: Request, res: Response): Promise<void> => {
  const communityId = parseInt(req.params.communityId, 10);
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (isNaN(communityId)) {
    res.status(400).json({ message: 'Invalid community ID' });
    return;
  }

  try {
    // Check if user is a member of the community
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

    const events = await eventService.findEventsByCommunityId(communityId);
    res.status(200).json(events);
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ message: 'Internal server error listing events' });
  }
};

export const exportIcs = async (req: Request, res: Response): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (isNaN(eventId)) {
    res.status(400).json({ message: 'Invalid event ID' });
    return;
  }

  try {
    const event = await eventService.findEventById(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Check if user is a member of the event's community
    const isMember = await communityService.isUserMember(userId, event.communityId);
    if (!isMember) {
      res.status(403).json({ message: 'Forbidden: User is not a member of the event\'s community' });
      return;
    }

    const icsContent = eventService.generateIcsContent(event);
    if (!icsContent) {
        throw new Error('Failed to generate ICS content');
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/calendar');
    // Use a generic name or derive from event title
    const filename = `event-${event.id}.ics`; 
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(icsContent);

  } catch (error: any) {
    console.error('Error exporting ICS:', error);
     if ((error as any).code === 'P2025') {
         res.status(404).json({ message: 'Event not found.'});
     } else {
        res.status(500).json({ message: `Internal server error exporting ICS: ${error.message}` });
     }
  }
}; 