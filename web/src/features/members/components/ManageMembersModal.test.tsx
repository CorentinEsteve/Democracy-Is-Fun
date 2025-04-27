import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ManageMembersModal } from './ManageMembersModal';
import { useMembers, useRemoveMember, useAddMember } from '@/features/membership/api';
import { Member } from '@/features/membership/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import React from 'react';

// Mock API hooks from membership feature
vi.mock('@/features/membership/api', () => ({
  useMembers: vi.fn(),
  useRemoveMember: vi.fn(),
  useAddMember: vi.fn(),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: {children: React.ReactNode}) => <div>{children}</div>
}));

const mockRemoveMutate = vi.fn();
const mockAddMutate = vi.fn();
const mockRefetchMembers = vi.fn();
const mockInvalidateQueries = vi.fn();

// Mock QueryClient methods used
vi.mock('@tanstack/react-query', async () => {
  const original = await vi.importActual('@tanstack/react-query');
  return {
    ...original,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

const queryClient = new QueryClient();
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

describe('ManageMembersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations for hooks
    (useAuth as vi.Mock).mockReturnValue({ user: { id: 1 } }); // Assume logged-in user is Admin
    (useMembers as vi.Mock).mockReturnValue({
      data: mockMembers,
      isLoading: false,
      error: null,
      refetch: mockRefetchMembers,
    });
    (useRemoveMember as vi.Mock).mockReturnValue({ mutate: mockRemoveMutate, isPending: false });
    (useAddMember as vi.Mock).mockReturnValue({ mutate: mockAddMutate, isPending: false, error: null });
  });

  const renderModal = () => {
    return render(
      <ManageMembersModal
        communityId={communityId}
        trigger={<Button>Open Modal</Button>}
      />,
      { wrapper }
    );
  };

  it('opens modal on trigger click and displays members', async () => {
    renderModal();
    const triggerButton = screen.getByRole('button', { name: 'Open Modal' });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Member')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('User ID or Email to add')).toBeInTheDocument(); // Add form is present
    expect(mockRefetchMembers).toHaveBeenCalled(); // Should refetch on open
  });

  it('calls remove member mutation when remove button is clicked', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));

    await waitFor(() => {
        expect(screen.getByLabelText('Remove Bob Member')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Remove Bob Member'));

    expect(mockRemoveMutate).toHaveBeenCalledTimes(1);
    expect(mockRemoveMutate).toHaveBeenCalledWith(
        { communityId: communityId, userId: 2 }, // Bob's ID
        expect.any(Object)
    );
    // Simulate success callback invalidating queries
    const mutateOptions = mockRemoveMutate.mock.calls[0][1];
    mutateOptions.onSuccess();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['members', communityId] });
  });

  it('calls add member mutation when form is submitted', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));

    await waitFor(() => {
        expect(screen.getByPlaceholderText('User ID or Email to add')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('User ID or Email to add');
    const addButton = screen.getByRole('button', { name: 'Add Member' });

    fireEvent.change(input, { target: { value: 'new@user.com' } });
    fireEvent.click(addButton);

    expect(mockAddMutate).toHaveBeenCalledTimes(1);
    expect(mockAddMutate).toHaveBeenCalledWith(
        { communityId: communityId, userIdentifier: 'new@user.com' },
        expect.any(Object)
    );
     // Simulate success callback invalidating queries
    const mutateOptions = mockAddMutate.mock.calls[0][1];
    mutateOptions.onSuccess();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['members', communityId] });
  });

  it('closes modal on close button click', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));

    await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Find the footer button specifically
    const dialog = screen.getByRole('dialog');
    // Get all potential close buttons
    const allCloseButtons = within(dialog).getAllByRole('button', { name: 'Close' });
    // Find the one that is NOT the absolute positioned icon button (i.e., doesn't have sr-only span)
    const footerCloseButton = allCloseButtons.find(
        (button) => !button.querySelector('span.sr-only')
    );

    if (!footerCloseButton) {
        throw new Error('Could not find the footer close button.');
    }

    fireEvent.click(footerCloseButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('displays loading indicator when members are loading', async () => {
    // Reset useMembers mock for this specific test case *before* rendering
     (useMembers as vi.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetchMembers,
    });
    
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));

    // Wait for the loading indicator to appear after the modal opens and triggers the query
    await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

   it('displays error message when members fail to load', async () => {
    const error = new Error('Failed to fetch members');
     // Reset useMembers mock for this specific test case *before* rendering
    (useMembers as vi.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: error,
      refetch: mockRefetchMembers,
    });
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));

    // Wait for the error alert to appear
    await waitFor(() => {
         const errorAlert = screen.getByTestId('error-alert');
         expect(errorAlert).toBeInTheDocument();
         expect(within(errorAlert).getByText(`Error loading members: ${error.message}`)).toBeInTheDocument();
    });
  });

});