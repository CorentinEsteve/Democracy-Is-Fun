import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import CommunityPage from '@/pages/CommunityPage';
// Import REAL AuthProvider and useAuth
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as AuthContextModule from '@/contexts/AuthContext'; // Import module for spyOn
import { useProposals, useVoteOnProposal, useCreateProposal } from '@/features/proposals/api';
import { Proposal, PartialUser, VoteType } from '@/features/proposals/types';
import React from 'react';

// --- Mocks --- 
vi.mock('@/features/proposals/api'); // Mock proposals API only
// REMOVED: vi.mock('@/contexts/AuthContext');

const mockUseProposals = vi.mocked(useProposals);
const mockUseVoteOnProposal = vi.mocked(useVoteOnProposal);
const mockUseCreateProposal = vi.mocked(useCreateProposal);
// REMOVED: const mockUseAuth = vi.mocked(useAuth);

// Mock ChatPanel to simplify testing
vi.mock('@/features/chat/components/ChatPanel', () => ({
  default: () => <div data-testid="chat-panel-mock">Chat Panel Mock</div>,
}));

// --- Test Setup ---
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockInitiator: PartialUser = { id: 2, name: 'Test Initiator' };
const mockProposal: Proposal = {
  id: 101,
  communityId: 1,
  initiatorId: mockInitiator.id,
  title: 'Test Proposal Render',
  description: null,
  location: null,
  dateTime: new Date().toISOString(),
  tags: [],
  deadline: new Date(Date.now() + 3600 * 1000).toISOString(),
  quorumPct: 100,
  status: 'Active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  initiator: mockInitiator,
  votes: [],
  waitingVoters: [],
};

const renderCommunityPage = (communityId: string) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {/* Use REAL AuthProvider */}
      <AuthProvider>
        <MemoryRouter initialEntries={[`/communities/${communityId}`]}>
          <Routes>
            <Route path="/communities/:communityId" element={<CommunityPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('CommunityPage', () => {
  const mockMutate = vi.fn();
  const currentUserId = 1;
  let useAuthSpy: vi.SpyInstance; // Declare spy variable

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();

    // Spy on the real useAuth and provide mock value for tests
    useAuthSpy = vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: currentUserId, name: 'Test User', email: 'test@user.com' },
      isAuthenticated: true, // Assuming needed by ProtectedRoute/Component
      isLoading: false,
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
    });

    // Default mock implementations for other hooks
    mockUseProposals.mockReturnValue({ data: [], isLoading: true } as any);
    mockUseVoteOnProposal.mockReturnValue({ mutate: mockMutate, isPending: false } as any);
    mockUseCreateProposal.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, isError: false, error: null, reset: vi.fn() } as any);
  });

  afterEach(() => {
      // Restore the original implementation after each test
      useAuthSpy.mockRestore();
  });

  it('renders loading state initially', () => {
    mockUseProposals.mockReturnValue({ data: [], isLoading: true } as any); // Ensure proposals are loading
    renderCommunityPage('1');
    // Check for the specific proposal loading indicator
    expect(screen.getByTestId('loading-proposals-indicator')).toBeInTheDocument(); 
    expect(screen.queryByText(/test proposal render/i)).not.toBeInTheDocument();
    // Chat panel should still render its own loading/content state
    // expect(screen.getByTestId('chat-panel-mock')).toBeInTheDocument(); 
  });

  it('renders error state', async () => {
    const error = new Error('Fetch Failed');
    mockUseProposals.mockReturnValue({ error, isError: true, isLoading: false } as any);
    renderCommunityPage('1');

    const errorElement = await screen.findByText(`Error loading proposals: ${error.message}`);
    expect(errorElement).toBeInTheDocument();
  });

  it('renders proposal list when data is loaded', async () => {
    mockUseProposals.mockReturnValue({ data: [mockProposal], isLoading: false, isSuccess: true } as any);
    renderCommunityPage('1');

    expect(await screen.findByText(mockProposal.title)).toBeInTheDocument();
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    expect(screen.queryByText(/error loading proposals/i)).not.toBeInTheDocument();
  });

  it('calls vote mutation when a vote button is clicked in ProposalCard', async () => {
     mockUseProposals.mockReturnValue({ data: [mockProposal], isLoading: false, isSuccess: true } as any);
     renderCommunityPage('1');

     const voteButton = await screen.findByRole('button', { name: /^Vote For \(\d+ votes\)$/i });
     expect(voteButton).toBeInTheDocument();
     
     fireEvent.click(voteButton);

     await waitFor(() => {
         expect(mockMutate).toHaveBeenCalledTimes(1);
         expect(mockMutate).toHaveBeenCalledWith({ id: mockProposal.id, voteType: 'For' });
     });
  });
}); 