import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import ProposalCard from './ProposalCard';
import { Proposal, PartialUser, Vote, VoteType, ProposalStatus } from '../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Sample Data Generation Helper
const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => {
    const initiator: PartialUser = { id: 1, name: 'Alice' };
    const voter1: PartialUser = { id: 2, name: 'Bob' };
    const voter2: PartialUser = { id: 3, name: 'Charlie' };
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week from now
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week ago

    const defaultProposal: Proposal = {
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
        votes: [
             { id: 1, proposalId: 10, voterId: initiator.id, voteType: 'For', voter: initiator },
        ],
        waitingVoters: [voter1, voter2],
        ...overrides,
    };
    return defaultProposal;
};

describe('ProposalCard', () => {
    const mockOnVote = vi.fn();
    const currentUserId = 2; // User 'Bob'

    // Helper to find buttons using aria-label
    const getVoteButton = (voteType: 'For' | 'Against' | 'Neutral') => {
        let labelRegex: RegExp;
        switch (voteType) {
            case 'For':
                labelRegex = /^Vote For \(\d+ votes\)$/i;
                break;
            case 'Against':
                labelRegex = /^Vote Against \(\d+ votes\)$/i;
                break;
            case 'Neutral':
                labelRegex = /^Vote Neutral \(\d+ votes\)$/i;
                break;
        }
        const button = screen.getByRole('button', { name: labelRegex });
        if (!button) throw new Error(`Could not find button with aria-label for vote type: ${voteType}`);
        return button;
    }

    beforeEach(() => {
        mockOnVote.mockClear();
    });

    it('renders proposal details correctly', () => {
        const proposal = createMockProposal();
        render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });

        expect(screen.getByText(proposal.title)).toBeInTheDocument();
        expect(screen.getByText(proposal.initiator.name)).toBeInTheDocument();
        expect(screen.getByText(proposal.location!)).toBeInTheDocument();
        expect(screen.getByText(new Date(proposal.dateTime).toLocaleString())).toBeInTheDocument();
        expect(screen.getByText('testing')).toBeInTheDocument();
        expect(screen.getByText('default')).toBeInTheDocument();
        
        // Check initial vote counts via aria-label (implicitly checked by getVoteButton finding them)
        expect(getVoteButton('For')).toBeInTheDocument(); 
        expect(getVoteButton('Against')).toBeInTheDocument();
        expect(getVoteButton('Neutral')).toBeInTheDocument();
        // Check text content if needed
        expect(getVoteButton('For')).toHaveTextContent('1');
        expect(getVoteButton('Against')).toHaveTextContent('0');
        expect(getVoteButton('Neutral')).toHaveTextContent('0');
    });

    it('displays deadline countdown', async () => {
        const proposal = createMockProposal();
        render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        // Check if countdown text exists (e.g., "in 7 days") - exact text depends on date-fns
        expect(await screen.findByText(/in \d+ days|\d+ days left/i)).toBeInTheDocument(); 
    });

    it('calls onVote when a vote button is clicked by eligible user', () => {
        const proposal = createMockProposal();
        render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });

        const forButton = getVoteButton('For');
        fireEvent.click(forButton);

        expect(mockOnVote).toHaveBeenCalledTimes(1);
        expect(mockOnVote).toHaveBeenCalledWith(proposal.id, 'For');
    });

    it('disables vote buttons if user has already voted', () => {
        const proposal = createMockProposal({
            votes: [
                { id: 1, proposalId: 10, voterId: 1, voteType: 'For', voter: { id: 1, name: 'Alice' } },
                { id: 2, proposalId: 10, voterId: currentUserId, voteType: 'Against', voter: { id: currentUserId, name: 'Bob' } },
            ],
            waitingVoters: [{ id: 3, name: 'Charlie' }]
        });
        render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        
        expect(getVoteButton('For')).toBeDisabled();
        expect(getVoteButton('Against')).toBeDisabled();
        expect(getVoteButton('Neutral')).toBeDisabled();
    });

    it('disables vote buttons if deadline has passed', () => {
        const proposal = createMockProposal({
            deadline: new Date(Date.now() - 1000).toISOString(),
            status: 'Active' 
        });
        render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });

        expect(getVoteButton('For')).toBeDisabled();
        expect(getVoteButton('Against')).toBeDisabled();
        expect(getVoteButton('Neutral')).toBeDisabled();
    });

     it('disables vote buttons if proposal status is not Active', () => {
        const proposal = createMockProposal({ status: 'Approved' });
        render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });

        expect(getVoteButton('For')).toBeDisabled();
        expect(getVoteButton('Against')).toBeDisabled();
        expect(getVoteButton('Neutral')).toBeDisabled();
    });

     it('shows green glow if user has not voted and proposal is active', () => {
        const proposal = createMockProposal(); // User 2 (Bob) hasn't voted
        const { container } = render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        // Check for a class containing shadow-green or similar
        expect(container.firstChild).toHaveClass(/shadow-green-500/);
        expect(container.firstChild).not.toHaveClass(/shadow-blue-500/);
    });

    it('shows blue glow if user has voted and proposal is active', () => {
        const proposal = createMockProposal({
             votes: [
                { id: 1, proposalId: 10, voterId: 1, voteType: 'For', voter: { id: 1, name: 'Alice' } },
                { id: 2, proposalId: 10, voterId: currentUserId, voteType: 'Against', voter: { id: currentUserId, name: 'Bob' } },
            ],
             waitingVoters: [{ id: 3, name: 'Charlie' }]
        });
        const { container } = render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        expect(container.firstChild).toHaveClass(/shadow-blue-500/);
        expect(container.firstChild).not.toHaveClass(/shadow-green-500/);
    });

    it('shows no glow if proposal is inactive (deadline passed)', () => {
        const proposal = createMockProposal({ deadline: new Date(Date.now() - 1000).toISOString() });
        const { container } = render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        expect(container.firstChild).not.toHaveClass(/shadow-green-500/);
        expect(container.firstChild).not.toHaveClass(/shadow-blue-500/);
    });

     it('shows no glow if proposal is inactive (status not Active)', () => {
        const proposal = createMockProposal({ status: 'Rejected' });
        const { container } = render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        expect(container.firstChild).not.toHaveClass(/shadow-green-500/);
        expect(container.firstChild).not.toHaveClass(/shadow-blue-500/);
    });

    it('displays waiting voters list', () => {
         const proposal = createMockProposal(); // Bob and Charlie waiting
         render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });

         expect(screen.getByText('Waiting for:')).toBeInTheDocument();
         // Check for fallback initials instead of img role
         expect(screen.getByText('B')).toBeInTheDocument(); // Bob's initial
         expect(screen.getByText('C')).toBeInTheDocument(); // Charlie's initial
         // Check initiator avatar separately if needed
         const initiatorAvatarFallback = screen.getByText('A');
         expect(initiatorAvatarFallback).toBeInTheDocument();
     });
}); 