import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemberList } from './MemberList';
import { Member } from '@/features/membership/types';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import React from 'react';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: {children: React.ReactNode}) => <div>{children}</div> // Mock provider
}));

const mockMembers: Member[] = [
  { id: 1, name: 'Alice Admin', email: 'alice@test.com', role: 'Admin', points: 100, membershipId: 11, avatarUrl: '' },
  { id: 2, name: 'Bob Member', email: 'bob@test.com', role: 'Member', points: 50, membershipId: 12, avatarUrl: '' },
  { id: 3, name: 'Charlie Member', email: 'charlie@test.com', role: 'Member', points: 20, membershipId: 13, avatarUrl: '' },
];

const mockOnRemove = vi.fn();

describe('MemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (ui: React.ReactElement, user: { id: number } | null) => {
    (useAuth as vi.Mock).mockReturnValue({ user });
    return render(<AuthProvider>{ui}</AuthProvider>);
  };

  it('renders members correctly', () => {
    renderWithAuth(
      <MemberList members={mockMembers} onRemove={mockOnRemove} isLoadingRemove={false} communityId={1} />,
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

  it('shows remove button for admins on other members', () => {
    renderWithAuth(
      <MemberList members={mockMembers} onRemove={mockOnRemove} isLoadingRemove={false} communityId={1} />,
      { id: 1 } // Current user is Admin
    );

    // Admin sees remove buttons for Bob and Charlie
    expect(screen.getByLabelText('Remove Bob Member')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Charlie Member')).toBeInTheDocument();
    // Admin does NOT see remove button for themselves
    expect(screen.queryByLabelText('Remove Alice Admin')).not.toBeInTheDocument();
  });

  it('hides remove button for non-admins', () => {
    renderWithAuth(
      <MemberList members={mockMembers} onRemove={mockOnRemove} isLoadingRemove={false} communityId={1} />,
      { id: 2 } // Current user is Bob (Member)
    );

    // Member sees no remove buttons
    expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    renderWithAuth(
      <MemberList members={mockMembers} onRemove={mockOnRemove} isLoadingRemove={false} communityId={1} />,
      { id: 1 } // Current user is Admin
    );

    const removeBobButton = screen.getByLabelText('Remove Bob Member');
    fireEvent.click(removeBobButton);

    expect(mockOnRemove).toHaveBeenCalledTimes(1);
    expect(mockOnRemove).toHaveBeenCalledWith(2); // Bob's ID
  });

  it('disables remove button when isLoadingRemove is true', () => {
    renderWithAuth(
      <MemberList members={mockMembers} onRemove={mockOnRemove} isLoadingRemove={true} communityId={1} />,
      { id: 1 } // Current user is Admin
    );

    expect(screen.getByLabelText('Remove Bob Member')).toBeDisabled();
    expect(screen.getByLabelText('Remove Charlie Member')).toBeDisabled();
  });

   it('shows "(You)" indicator for the current user', () => {
    renderWithAuth(
      <MemberList members={mockMembers} onRemove={mockOnRemove} isLoadingRemove={false} communityId={1} />,
      { id: 2 } // Current user is Bob (Member)
    );
    const bobRow = screen.getByText('Bob Member').closest('tr');
    expect(bobRow).toHaveTextContent('(You)');

    const aliceRow = screen.getByText('Alice Admin').closest('tr');
    expect(aliceRow).not.toHaveTextContent('(You)');
  });

}); 