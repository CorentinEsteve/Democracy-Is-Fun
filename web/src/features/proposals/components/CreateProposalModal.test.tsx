import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import CreateProposalModal from './CreateProposalModal';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster'; // Needed for useToast hook

// Mock API hook
const mockMutateAsync = vi.fn();
const mockReset = vi.fn();
const mockUseCreateProposal = vi.fn(() => ({ 
    mutateAsync: mockMutateAsync, 
    isPending: false,
    isError: false,
    error: null,
    reset: mockReset
}));

vi.mock('../api', () => ({ 
    useCreateProposal: () => mockUseCreateProposal(),
    // Ensure other hooks aren't accidentally mocked if they exist
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ 
        toast: mockToast, 
        toasts: []
    }),
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
    <Toaster /> {/* Render toaster for toast messages */}
  </QueryClientProvider>
);

const renderCreateModal = (communityId: number) => {
  const user = userEvent.setup();
  const utils = render(
    <CreateProposalModal communityId={communityId}>
      <Button>+ New Proposal</Button>
    </CreateProposalModal>,
    { wrapper }
  );
  return { ...utils, user };
};

describe('CreateProposalModal', () => {
  const communityId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock states
    mockUseCreateProposal.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
        reset: mockReset
    });
  });

  it('opens modal on trigger click', async () => {
    const { user } = renderCreateModal(communityId);
    await user.click(screen.getByRole('button', { name: /new proposal/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create new proposal/i })).toBeInTheDocument();
  });

  it('requires title field', async () => {
    const { user } = renderCreateModal(communityId);
    await user.click(screen.getByRole('button', { name: /new proposal/i }));

    const submitButton = screen.getByRole('button', { name: /submit proposal/i });
    await user.click(submitButton); 

    expect(mockMutateAsync).not.toHaveBeenCalled();
    // Wait specifically for the error message associated with the title input
    const titleError = await screen.findByText(/title is required/i);
    expect(titleError).toBeInTheDocument();
    // Optionally, check it's near the title input if necessary
    // const titleInput = screen.getByLabelText(/title/i);
    // expect(titleInput.closest('div')).toContainElement(titleError);
  });

  it('calls createProposal mutation with correct data on submit', async () => {
    mockMutateAsync.mockResolvedValueOnce({}); 
    const { user } = renderCreateModal(communityId);
    await user.click(screen.getByRole('button', { name: /new proposal/i }));

    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);
    const locInput = screen.getByLabelText(/location/i);
    const tagsInput = screen.getByLabelText(/tags/i);
    const quorumInput = screen.getByLabelText(/quorum/i);
    // Select the datetime-local inputs by label
    const dateTimeInput = screen.getByLabelText(/date & time/i); 
    const deadlineInput = screen.getByLabelText(/deadline/i);
    
    // Store input values
    const dateTimeValue = '2025-05-01T14:30';
    const deadlineValue = '2025-05-10T23:59';

    await user.type(titleInput, 'My Test Proposal');
    await user.type(descInput, 'Detailed description');
    await user.type(locInput, 'Meeting Room 1');
    await user.type(tagsInput, 'urgent, meeting ');
    await user.clear(quorumInput);
    await user.type(quorumInput, '75');
    
    // Fill inputs using variables
    await fireEvent.change(dateTimeInput, { target: { value: dateTimeValue } });
    await fireEvent.change(deadlineInput, { target: { value: deadlineValue } });

    const submitButton = screen.getByRole('button', { name: /submit proposal/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      
      // Dynamically generate expected ISO strings based on input values
      const expectedDateTimeISO = new Date(dateTimeValue).toISOString();
      const expectedDeadlineISO = new Date(deadlineValue).toISOString();

      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        communityId: communityId,
        title: 'My Test Proposal',
        description: 'Detailed description',
        location: 'Meeting Room 1',
        tags: ['urgent', 'meeting'],
        quorumPct: 75,
        dateTime: expectedDateTimeISO, 
        deadline: expectedDeadlineISO,
      }));
    });

    // Check if modal closes and toast is called
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Proposal Created" }));
  });

   it('shows loading state on submit button when pending', async () => {
     mockMutateAsync.mockImplementation(() => new Promise(() => {})); // Never resolves
     mockUseCreateProposal.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true, // Set pending state
        isError: false,
        error: null,
        reset: mockReset
    });

    const { user } = renderCreateModal(communityId);
    await user.click(screen.getByRole('button', { name: /new proposal/i }));

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Loading Test');

    // Directly check button state after render with pending=true
    // No need to click submit if mutation is already pending via mock
    const submitButton = screen.getByRole('button', { name: /submitting.../i });
    expect(submitButton).toBeDisabled();
    expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
  });

    it('displays API error message on mutation failure', async () => {
        const errorMsg = 'Network Error - Failed to submit';
        mockMutateAsync.mockRejectedValueOnce(new Error(errorMsg));
        mockUseCreateProposal.mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: false,
            isError: true, // Set error state
            error: new Error(errorMsg),
            reset: mockReset
        });

        const { user } = renderCreateModal(communityId);
        await user.click(screen.getByRole('button', { name: /new proposal/i }));

        const titleInput = screen.getByLabelText(/title/i);
        await user.type(titleInput, 'Error Test');
        
        // Submit to trigger the already-mocked error state display
        const submitButton = screen.getByRole('button', { name: /submit proposal/i });
        await user.click(submitButton);

        // Even though mutateAsync rejects, the error state is mocked directly
        expect(await screen.findByRole('alert')).toHaveTextContent(errorMsg);
        expect(screen.getByRole('dialog')).toBeInTheDocument(); // Modal should stay open
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));

    });

  it('closes modal on cancel click', async () => {
    const { user } = renderCreateModal(communityId);
    await user.click(screen.getByRole('button', { name: /new proposal/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

   it('resets form when modal is closed', async () => {
       const { user } = renderCreateModal(communityId);
       await user.click(screen.getByRole('button', { name: /new proposal/i }));
       const titleInput = screen.getByLabelText(/title/i);
       await user.type(titleInput, 'Temporary Title');
       expect(titleInput).toHaveValue('Temporary Title');

       await user.click(screen.getByRole('button', { name: /cancel/i }));
       await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

       await user.click(screen.getByRole('button', { name: /new proposal/i })); // Reopen
       expect(await screen.findByLabelText(/title/i)).toHaveValue(''); // Should be reset
   });
}); 