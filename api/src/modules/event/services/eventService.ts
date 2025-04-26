import { Event } from '@prisma/client';
import * as ics from 'ics';
import { prisma } from '../../../server'; // Adjust path if necessary

export const findEventsByCommunityId = async (communityId: number): Promise<Event[]> => {
  return prisma.event.findMany({
    where: { communityId },
    orderBy: {
      dateTime: 'asc', // Order by date
    },
  });
};

export const findEventById = async (eventId: number): Promise<Event | null> => {
    return prisma.event.findUnique({
        where: { id: eventId },
    });
}

export const generateIcsContent = (event: Event): string | undefined => {
  const { title, dateTime, location } = event;

  // Convert Date to array format required by ics library
  const startDateTime = new Date(dateTime);
  const year = startDateTime.getFullYear();
  const month = startDateTime.getMonth() + 1; // Month is 0-indexed
  const day = startDateTime.getDate();
  const hours = startDateTime.getHours();
  const minutes = startDateTime.getMinutes();

  // Basic event structure (add more fields as needed, e.g., end time, organizer)
  const eventData: ics.EventAttributes = {
    title: title,
    start: [year, month, day, hours, minutes],
    duration: { hours: 1 }, // Default duration, adjust as needed
    location: location || undefined, // Use location if available
    status: 'CONFIRMED',
    // busyStatus: 'BUSY', // Optional
    // url: 'http://example.com/event-details', // Optional link
  };

  const { error, value } = ics.createEvent(eventData);

  if (error) {
    console.error('Error generating ICS:', error);
    return undefined;
  }

  return value;
}; 