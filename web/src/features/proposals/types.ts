import { Community } from '@/features/communities/types';

// Basic User structure needed for voters/initiators
export interface PartialUser {
  id: number;
  name: string;
  avatarUrl?: string | null;
}

export type VoteType = 'For' | 'Against' | 'Neutral';

export interface Vote {
  id: number;
  proposalId: number;
  voterId: number;
  voteType: VoteType;
  voter: PartialUser; // Include voter details if needed by UI
}

export type ProposalStatus = 'Active' | 'Approved' | 'Rejected';

export interface Proposal {
  id: number;
  communityId: number;
  initiatorId: number;
  title: string;
  description: string | null;
  location: string | null;
  dateTime: string; // ISO string format expected
  tags: string[];
  deadline: string; // ISO string format expected
  quorumPct: number; // Percentage (0-100)
  status: ProposalStatus;
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
  initiator: PartialUser;
  votes: Vote[];
  // Assuming the backend provides a list of users who haven't voted yet
  // This is simpler than calculating it on the frontend
  waitingVoters: PartialUser[]; 
  community?: Community; // Optional, depending on API response
} 