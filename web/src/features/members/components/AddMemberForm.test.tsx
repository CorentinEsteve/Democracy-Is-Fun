import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AddMemberForm } from './AddMemberForm';
import { useAddMember } from '@/features/membership/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the useAddMember hook
vi.mock('@/features/membership/api', () => ({
  useAddMember: vi.fn(),
}));

const mockMutate = vi.fn();
const mockInvalidateQueries = vi.fn();

// Mock QueryClient
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
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('AddMemberForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementation before each test
    (useAddMember as vi.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });
  });

  it('renders input and button', () => {
    render(<AddMemberForm communityId={1} />, { wrapper });
    expect(screen.getByPlaceholderText('User ID or Email to add')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Member/i })).toBeInTheDocument();
  });

  it('calls addMember mutation on submit with valid input', async () => {
    render(<AddMemberForm communityId={1} />, { wrapper });

    const input = screen.getByPlaceholderText('User ID or Email to add');
    const button = screen.getByRole('button', { name: /Add Member/i });

    await fireEvent.change(input, { target: { value: ' test@example.com ' } });
    await fireEvent.click(button);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      { communityId: 1, userIdentifier: 'test@example.com' }, // Should trim input
      expect.any(Object) // Includes onSuccess and onError callbacks
    );
  });

  it('clears input and invalidates queries on successful mutation', async () => {
    // Simulate successful mutation by immediately calling onSuccess
    mockMutate.mockImplementation((_variables, options) => {
      options.onSuccess();
    });

    render(<AddMemberForm communityId={1} />, { wrapper });

    const input = screen.getByPlaceholderText('User ID or Email to add') as HTMLInputElement;
    const button = screen.getByRole('button', { name: /Add Member/i });

    await fireEvent.change(input, { target: { value: 'new@user.com' } });
    await fireEvent.click(button);

    await waitFor(() => {
        expect(input.value).toBe(''); // Input should be cleared
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['members', 1] });
  });

  it('does not call mutation if input is empty or whitespace', async () => {
    render(<AddMemberForm communityId={1} />, { wrapper });

    const input = screen.getByPlaceholderText('User ID or Email to add');
    const button = screen.getByRole('button', { name: /Add Member/i });

    await fireEvent.change(input, { target: { value: '   ' } });
    await fireEvent.click(button);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('disables input and button while mutation is pending', () => {
    (useAddMember as vi.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      error: null,
    });

    render(<AddMemberForm communityId={1} />, { wrapper });

    expect(screen.getByPlaceholderText('User ID or Email to add')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add Member/i })).toBeDisabled();
    // Check for loading spinner
    expect(screen.getByRole('button', { name: /Add Member/i }).querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays error message on mutation error', async () => {
    const error = new Error('User not found');
    (useAddMember as vi.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: error,
    });

     // Simulate error by calling onError
     mockMutate.mockImplementation((_variables, options) => {
         options.onError(error);
     });

    render(<AddMemberForm communityId={1} />, { wrapper });

    // Trigger mutation to potentially show error
    const input = screen.getByPlaceholderText('User ID or Email to add');
    const button = screen.getByRole('button', { name: /Add Member/i });
    await fireEvent.change(input, { target: { value: 'error@user.com' } });
    await fireEvent.click(button);

    await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });
}); 