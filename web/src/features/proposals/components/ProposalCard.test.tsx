import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import ProposalCard from './ProposalCard';
import { Proposal, PartialUser, Vote, VoteType, ProposalStatus } from '../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMembers } from '@/features/membership/api'; // Import hook to mock

// Mock the useMembers hook
vi.mock('@/features/membership/api', () => ({
    useMembers: vi.fn(),
    // Keep other potential exports if they exist and are needed
}));

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
        quorumPct: 80,
        status: 'Active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        initiator: initiator,
        votes: [
             { id: 1, proposalId: 10, voterId: 1, voteType: 'For', voter: { id: 1, name: 'Alice' } },
             { id: 2, proposalId: 10, voterId: 2, voteType: 'Against', voter: { id: 2, name: 'Bob' } },
        ],
        waitingVoters: [{ id: 3, name: 'Charlie' }],
        ...overrides,
    };
    return defaultProposal;
};

describe('ProposalCard', () => {
    const mockOnVote = vi.fn();
    const currentUserId = 3; // User 'Charlie'

    beforeEach(() => {
        mockOnVote.mockClear();
        // Reset mock implementation for useMembers before each test
        (useMembers as vi.Mock).mockReturnValue({ 
            data: [
                { userId: 1, user: { id: 1, name: 'Alice' } }, // Mock 3 members
                { userId: 2, user: { id: 2, name: 'Bob' } },
                { userId: 3, user: { id: 3, name: 'Charlie' } },
            ], 
            isLoading: false, 
            error: null 
        });
    });

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
        // Correct assertions for vote counts based on default mock data
        expect(getVoteButton('For')).toHaveTextContent('1'); // Default has 1 For vote
        expect(getVoteButton('Against')).toHaveTextContent('1'); // Default has 1 Against vote
        expect(getVoteButton('Neutral')).toHaveTextContent('0');
    });

    it('displays deadline countdown and quorum info', async () => {
        const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(); // 3 hours from now
        const proposal = createMockProposal({ 
            deadline: futureDate,
            votes: [ // Example: 2 votes cast
                 { id: 1, proposalId: 10, voterId: 1, voteType: 'For', voter: { id: 1, name: 'Alice' } },
                 { id: 2, proposalId: 10, voterId: 2, voteType: 'Against', voter: { id: 2, name: 'Bob' } },
            ],
            quorumPct: 80, // Set quorum
        });
        
        render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        
        // Check quorum text (2 votes / 3 members from mock)
        expect(screen.getByTestId('quorum-info')).toHaveTextContent('2 of 3 votes (quorum 80%)');

        // Check if countdown text exists (e.g., "3 hours left")
        // Use findByText for async nature of countdown, but formatDistanceToNowStrict is sync here
        // Let's use getByText with a matcher
        expect(screen.getByText(/Time left: 3 hours/i)).toBeInTheDocument(); 
    });

    it('displays Expired when deadline has passed', () => {
        const pastDate = new Date(Date.now() - 1000).toISOString();
        const proposal = createMockProposal({ deadline: pastDate });
        render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });
        expect(screen.getByText('Expired')).toBeInTheDocument();
        expect(screen.queryByText(/Time left:/)).not.toBeInTheDocument();
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
        // THIS TEST IS NO LONGER VALID - REMOVING
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
        const proposal = createMockProposal(); // User 3 (Charlie) hasn't voted
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
         const proposal = createMockProposal(); // Default waiting list has only Charlie
         render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });

         const waitingListSection = screen.getByText('Waiting for:').closest('div');
         expect(waitingListSection).toBeInTheDocument();

         // Check only for Charlie's initial ('C') within the waiting list section
         // Initiator 'A' and voted 'B' should not be found *within this section*
         expect(within(waitingListSection!).queryByText('A')).not.toBeInTheDocument(); 
         expect(within(waitingListSection!).queryByText('B')).not.toBeInTheDocument(); 
         expect(within(waitingListSection!).getByText('C')).toBeInTheDocument(); 
     });

    it('allows user to change their vote', () => {
        const proposal = createMockProposal({
            votes: [
                { id: 1, proposalId: 10, voterId: 1, voteType: 'For', voter: { id: 1, name: 'Alice' } },
                // Current user (3) initially voted 'For'
                { id: 3, proposalId: 10, voterId: currentUserId, voteType: 'For', voter: { id: currentUserId, name: 'Charlie' } }, 
            ],
            waitingVoters: [{ id: 2, name: 'Bob' }] // Bob hasn't voted
        });
        
        // Use rerender from the initial render call
        const { rerender } = render(<ProposalCard proposal={proposal} onVote={mockOnVote} currentUserId={currentUserId} />, { wrapper });

        // Check initial state: 'For' button is selected (default variant)
        const forButton = getVoteButton('For');
        const againstButton = getVoteButton('Against');
        expect(forButton).toHaveClass(/bg-primary|border-primary/); // Check for default/selected style
        expect(againstButton).not.toHaveClass(/bg-destructive/); // Check against button is outline
        expect(forButton).not.toBeDisabled(); // Buttons should NOT be disabled
        expect(againstButton).not.toBeDisabled();

        // Click the 'Against' button
        fireEvent.click(againstButton);

        // Assert onVote was called with the new vote type
        expect(mockOnVote).toHaveBeenCalledTimes(1);
        expect(mockOnVote).toHaveBeenCalledWith(proposal.id, 'Against');

        // Create updated proposal data
        const updatedProposal = createMockProposal({
            ...proposal,
            votes: [
                { id: 1, proposalId: 10, voterId: 1, voteType: 'For', voter: { id: 1, name: 'Alice' } },
                // User 3 vote is now 'Against'
                { id: 3, proposalId: 10, voterId: currentUserId, voteType: 'Against', voter: { id: currentUserId, name: 'Charlie' } }, 
            ],
        });

        // Use rerender to update the component with new props
        rerender(<ProposalCard proposal={updatedProposal} onVote={mockOnVote} currentUserId={currentUserId} />); 

        // Check updated state: 'Against' button is selected (destructive variant)
        // Now getVoteButton will only search within the single, updated component instance
        const updatedForButton = getVoteButton('For');
        const updatedAgainstButton = getVoteButton('Against');
        expect(updatedForButton).not.toHaveClass(/bg-primary|border-primary/);
        expect(updatedAgainstButton).toHaveClass(/bg-destructive|border-destructive/); 
    });
}); 