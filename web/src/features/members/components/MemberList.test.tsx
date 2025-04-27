import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemberList } from './MemberList';
import { MembershipWithUser, MembershipRole } from '@/features/membership/types';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRemoveMember, useUpdateMember } from '@/features/membership/api';
import React from 'react';
import userEvent from '@testing-library/user-event';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: {children: React.ReactNode}) => <div>{children}</div> // Mock provider
}));

// Mock API Hooks
const mockRemoveMutate = vi.fn();
const mockUpdateRoleMutate = vi.fn();
vi.mock('@/features/membership/api', () => ({
    useRemoveMember: () => ({ mutate: mockRemoveMutate, isPending: false }),
    useUpdateMember: () => ({ mutate: mockUpdateRoleMutate, isPending: false }),
}));

// Mock QueryClient
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const original = await vi.importActual('@tanstack/react-query');
  return {
    ...original,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
);

const mockMembers: MembershipWithUser[] = [
  {
    userId: 1,
    communityId: 1,
    role: MembershipRole.Admin,
    points: 100,
    membershipId: 11,
    joinedAt: new Date().toISOString(),
    user: {
      id: 1,
      name: 'Alice Admin',
      avatarUrl: ''
    }
  },
  {
    userId: 2,
    communityId: 1,
    role: MembershipRole.Member,
    points: 50,
    membershipId: 12,
    joinedAt: new Date().toISOString(),
    user: {
      id: 2,
      name: 'Bob Member',
      avatarUrl: ''
    }
  },
  {
    userId: 3,
    communityId: 1,
    role: MembershipRole.Member,
    points: 20,
    membershipId: 13,
    joinedAt: new Date().toISOString(),
    user: {
      id: 3,
      name: 'Charlie Member',
      avatarUrl: ''
    }
  },
];

describe('MemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (ui: React.ReactElement, user: { id: number } | null) => {
    (useAuth as vi.Mock).mockReturnValue({ user });
    return render(ui, { wrapper });
  };

  it('renders members correctly', () => {
    renderWithAuth(
      <MemberList members={mockMembers} communityId={1} />,
      { id: 1 } // Assume current user is Alice (Admin)
    );

    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Member')).toBeInTheDocument();
    expect(screen.getByText('Charlie Member')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(mockMembers.length + 1); // +1 for header
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Member')).toHaveLength(2);
    expect(screen.getByText('100')).toBeInTheDocument(); // Alice's points
  });

  it('shows remove button and role dropdown for admins on other members', () => {
    renderWithAuth(
      <MemberList members={mockMembers} communityId={1} />,
      { id: 1 } // Current user is Admin
    );

    // Admin sees remove buttons & dropdowns for Bob and Charlie
    expect(screen.getByLabelText('Remove Bob Member')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Charlie Member')).toBeInTheDocument();
    
    // Find dropdowns within specific rows (more robust)
    const bobRow = screen.getByText('Bob Member').closest('tr');
    const charlieRow = screen.getByText('Charlie Member').closest('tr');
    expect(within(bobRow!).getByRole('combobox')).toBeInTheDocument();
    expect(within(charlieRow!).getByRole('combobox')).toBeInTheDocument();

    // Admin does NOT see remove button/dropdown for themselves
    expect(screen.queryByLabelText('Remove Alice Admin')).not.toBeInTheDocument();
    const aliceRow = screen.getByText('Alice Admin').closest('tr');
    // Ensure Alice's row does NOT contain a combobox trigger
    expect(within(aliceRow!).queryByRole('combobox')).not.toBeInTheDocument(); 
  });

  it('hides remove button and role dropdown for non-admins', () => {
    renderWithAuth(
      <MemberList members={mockMembers} communityId={1} />,
      { id: 2 } // Current user is Bob (Member)
    );

    // Member sees no remove buttons or role dropdowns
    expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('calls remove mutation when remove button is clicked', () => {
    renderWithAuth(
      <MemberList members={mockMembers} communityId={1} />,
      { id: 1 } // Current user is Admin
    );

    const removeBobButton = screen.getByLabelText('Remove Bob Member');
    fireEvent.click(removeBobButton);

    expect(mockRemoveMutate).toHaveBeenCalledTimes(1);
    expect(mockRemoveMutate).toHaveBeenCalledWith({ communityId: 1, userId: 2 }, expect.any(Object));
  });

  it('calls update role mutation when role is changed', async () => {
    const user = userEvent.setup();
    renderWithAuth(
      <MemberList members={mockMembers} communityId={1} />,
      { id: 1 } // Current user is Admin
    );

    // Find Bob's row and the dropdown trigger within it
    const bobRow = screen.getByText('Bob Member').closest('tr');
    const dropdownTrigger = within(bobRow!).getByRole('combobox');
    
    await user.click(dropdownTrigger);

    // Find and click the option - ensure it's available after the click
    const option = await screen.findByRole('option', { name: 'Admin' }); 
    await user.click(option);

    expect(mockUpdateRoleMutate).toHaveBeenCalledTimes(1);
    expect(mockUpdateRoleMutate).toHaveBeenCalledWith(
        { communityId: 1, userId: 2, role: MembershipRole.Admin }, 
        expect.any(Object)
    );
  });

  it('shows "(You)" indicator for the current user', () => {
    renderWithAuth(
      <MemberList members={mockMembers} communityId={1} />,
      { id: 2 } // Current user is Bob (Member)
    );
    const bobRow = screen.getByText('Bob Member').closest('tr');
    expect(bobRow).toHaveTextContent('(You)');

    const aliceRow = screen.getByText('Alice Admin').closest('tr');
    expect(aliceRow).not.toHaveTextContent('(You)');
  });
}); 