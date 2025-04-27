import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CommunityPage from '@/pages/CommunityPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useMembers, useRemoveMember, useAddMember } from '@/features/membership/api';
import { useProposals } from '@/features/proposals/api'; // Needed by CommunityPage
import { Member } from '@/features/membership/types';
import React from 'react';

// Mock API hooks
vi.mock('@/features/membership/api', () => ({
  useMembers: vi.fn(),
  useRemoveMember: vi.fn(),
  useAddMember: vi.fn(),
}));
vi.mock('@/features/proposals/api', () => ({ // Mock proposals hooks as well
  useProposals: vi.fn(),
  useVoteOnProposal: vi.fn(() => ({ mutate: vi.fn() })),
  useCreateProposal: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
}));
vi.mock('@/features/chat/api', () => ({ // Mock chat hooks
    useMessages: vi.fn(() => ({ data: [], isLoading: false, error: null })),
    useCreateMessage: vi.fn(() => ({ mutate: vi.fn() })),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: {children: React.ReactNode}) => <div>{children}</div>
}));

const mockRemoveMutate = vi.fn();
const mockAddMutate = vi.fn();
const mockRefetchMembers = vi.fn();

// Mock QueryClient - basic needed for provider
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

const mockMembers: Member[] = [
  { id: 1, name: 'Alice Admin', email: 'alice@test.com', role: 'Admin', points: 100, membershipId: 11, avatarUrl: '' },
  { id: 2, name: 'Bob Member', email: 'bob@test.com', role: 'Member', points: 50, membershipId: 12, avatarUrl: '' },
];

const communityId = 1;

describe('CommunityPage - Members Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock hooks implementations
    (useAuth as vi.Mock).mockReturnValue({ user: { id: 1 } }); // User is Admin
    (useMembers as vi.Mock).mockReturnValue({
      data: mockMembers,
      isLoading: false,
      error: null,
      refetch: mockRefetchMembers,
    });
    (useRemoveMember as vi.Mock).mockReturnValue({ mutate: mockRemoveMutate, isPending: false });
    (useAddMember as vi.Mock).mockReturnValue({ mutate: mockAddMutate, isPending: false, error: null });
    (useProposals as vi.Mock).mockReturnValue({ data: [], isLoading: false, error: null }); // Mock proposals data
  });

  const renderCommunityPage = () => {
    return render(
      <MemoryRouter initialEntries={[`/communities/${communityId}`]}>
        <Routes>
          <Route path="/communities/:communityId" element={<CommunityPage />} />
        </Routes>
      </MemoryRouter>,
      { wrapper }
    );
  };

  it('opens Manage Members modal when button is clicked', async () => {
    renderCommunityPage();
    const manageButton = screen.getByRole('button', { name: /Manage Members/i });
    fireEvent.click(manageButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice Admin')).toBeInTheDocument(); // Check if members list is shown
  });

  it('calls remove API when member is removed via modal', async () => {
    renderCommunityPage();
    fireEvent.click(screen.getByRole('button', { name: /Manage Members/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Remove Bob Member')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Remove Bob Member'));

    expect(mockRemoveMutate).toHaveBeenCalledWith(
        { communityId: communityId, userId: 2 },
        expect.any(Object)
    );
  });

  it('calls add API when member is added via modal form', async () => {
    renderCommunityPage();
    fireEvent.click(screen.getByRole('button', { name: /Manage Members/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('User ID or Email to add')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('User ID or Email to add');
    const addButton = screen.getByRole('button', { name: 'Add Member' });

    fireEvent.change(input, { target: { value: 'new@user.com' } });
    fireEvent.click(addButton);

    expect(mockAddMutate).toHaveBeenCalledWith(
        { communityId: communityId, userIdentifier: 'new@user.com' },
        expect.any(Object)
    );
  });
}); 