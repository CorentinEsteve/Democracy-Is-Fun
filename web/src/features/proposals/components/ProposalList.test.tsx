import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ProposalList from './ProposalList';
import { Proposal, PartialUser } from '../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/features/membership/api';

// Mock hooks used by ProposalCard
vi.mock('@/features/membership/api', () => ({
    useMembers: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  // Provide a basic mock AuthProvider
  AuthProvider: ({ children }: {children: React.ReactNode}) => <div>{children}</div> 
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider> 
  </QueryClientProvider>
);

// Helper from ProposalCard.test
const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => {
     const initiator: PartialUser = { id: 1, name: 'Alice' };
     const now = new Date();
     const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

     return {
        id: 10,
        communityId: 1,
        initiatorId: initiator.id,
        title: 'Default Test Proposal',
        description: 'This is a test description.',
        location: 'Test Location',
        dateTime: now.toISOString(),
        tags: ['testing', 'default'],
        deadline: futureDate,
        quorumPct: 50,
        status: 'Active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        initiator: initiator,
        votes: [],
        waitingVoters: [],
        ...overrides,
    };
};

describe('ProposalList', () => {
    const mockOnVote = vi.fn();
    const currentUserId = 1;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        // Provide default mocks for hooks used by ProposalCard
        (useAuth as vi.Mock).mockReturnValue({ user: { id: currentUserId } });
        (useMembers as vi.Mock).mockReturnValue({ 
            data: [], // Provide empty array or mock data as needed by Card
            isLoading: false, 
            error: null 
        });
    });

    it('renders a list of ProposalCards', () => {
        const proposals = [
            createMockProposal({ id: 1, title: 'Proposal Alpha'}),
            createMockProposal({ id: 2, title: 'Proposal Beta'}),
        ];
        render(<ProposalList proposals={proposals} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });

        expect(screen.getByText('Proposal Alpha')).toBeInTheDocument();
        expect(screen.getByText('Proposal Beta')).toBeInTheDocument();
    });

    it('renders empty state when no proposals are provided', () => {
        render(<ProposalList proposals={[]} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        expect(screen.getByText(/no active proposals/i)).toBeInTheDocument();
    });
}); 