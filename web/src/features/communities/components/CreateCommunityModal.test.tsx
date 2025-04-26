import { render, screen, fireEvent, waitFor, act, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Import userEvent
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import CreateCommunityModal from './CreateCommunityModal';
import React from 'react';
import { Button } from '@/ui/button';
import apiClient from '@/api/axios'; // Import the real apiClient

// --- Mock the apiClient directly --- 
vi.mock('@/api/axios');
const mockedApiClient = vi.mocked(apiClient, true);

// --- REMOVED mock for ../api (useCreateCommunity) ---

// React Query wrapper
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Disable retries to prevent tests hanging
            retry: false,
        },
    },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderModal = () => {
  // Setup userEvent for each render
  const user = userEvent.setup(); 
  const utils = render(
    <CreateCommunityModal>
      <Button>Create Community</Button>
    </CreateCommunityModal>,
    { wrapper }
  );
  return { ...utils, user }; // Return userEvent instance
};

describe('CreateCommunityModal', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear all mocks
    queryClient.clear(); // Clear react-query cache
    // Reset apiClient mocks if needed, e.g.:
    mockedApiClient.post.mockReset();
  });

  it('opens the modal when trigger is clicked', async () => {
    const { user } = renderModal();
    const triggerButton = screen.getByRole('button', { name: /create community/i });
    await user.click(triggerButton);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /name\*/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /image url/i })).toBeInTheDocument();
  });

  it('calls API on form submit and closes modal on success', async () => {
    const createdCommunity = { id: 1, name: 'New Comm' };
    mockedApiClient.post.mockResolvedValueOnce({ data: createdCommunity });
    const { user } = renderModal();

    await user.click(screen.getByRole('button', { name: /create community/i }));

    const nameInput = await screen.findByRole('textbox', { name: /name\*/i });
    const saveButton = screen.getByRole('button', { name: /save community/i });

    await user.type(nameInput, 'New Community Name');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
    });

    // Wait for the dialog to disappear using waitFor + queryBy
    await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('displays error message on API failure and keeps modal open', async () => {
     const errorMsg = 'Server Error';
     mockedApiClient.post.mockRejectedValueOnce(new Error(errorMsg)); // Mock API failure
     const { user } = renderModal();

     await user.click(screen.getByRole('button', { name: /create community/i }));
     const nameInput = await screen.findByRole('textbox', { name: /name\*/i });
     await user.type(nameInput, 'Fail Community');
     await user.click(screen.getByRole('button', { name: /save community/i }));

     // Wait for error message to appear
     expect(await screen.findByRole('alert')).toHaveTextContent(errorMsg);
     // Ensure modal is still open
     expect(screen.getByRole('dialog')).toBeInTheDocument();
   });

  it('shows loading state and disables inputs/buttons when submitting', async () => {
    // Mock apiClient.post to return a promise that never resolves
    mockedApiClient.post.mockImplementation(() => new Promise(() => {}));

    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /create community/i }));

    const nameInput = await screen.findByRole('textbox', { name: /name\*/i });
    await user.type(nameInput, 'Test Loading State');
    
    // Click Save button
    await user.click(screen.getByRole('button', { name: /save community/i }));

    // Wait for the button to show the loading state
    const savingButton = await screen.findByRole('button', { name: /saving.../i });
    expect(savingButton).toBeInTheDocument();
    expect(savingButton).toBeDisabled();

    // Now verify other elements are also disabled
    expect(screen.getByRole('textbox', { name: /name\*/i })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /description/i })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /image url/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(savingButton.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('closes the modal on cancel click', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /create community/i })); 
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i })); 
    // Wait for disappearance using waitFor + queryBy
    await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('resets form when modal is closed via cancel or overlay click', async () => {
    const { user } = renderModal();
    const triggerButton = screen.getByRole('button', { name: /create community/i });

    await user.click(triggerButton);
    const nameInput = await screen.findByRole('textbox', { name: /name\*/i });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.type(nameInput, 'Temporary Name');
    expect(nameInput).toHaveValue('Temporary Name');

    await user.click(screen.getByRole('button', { name: /cancel/i }));
     // Wait for disappearance using waitFor + queryBy
    await waitFor(() => {
       expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.click(triggerButton);
    const nameInputAfterReopen = await screen.findByRole('textbox', { name: /name\*/i });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(nameInputAfterReopen).toHaveValue('');

    await user.type(nameInputAfterReopen, 'Another Temp Name');
    expect(nameInputAfterReopen).toHaveValue('Another Temp Name');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
     // Wait for disappearance using waitFor + queryBy
    await waitFor(() => {
       expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.click(triggerButton);
    const finalNameInput = await screen.findByRole('textbox', { name: /name\*/i });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(finalNameInput).toHaveValue('');
  });

  it('disables save button when name is empty or only whitespace', async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole('button', { name: /create community/i }));

    const nameInput = await screen.findByRole('textbox', { name: /name\*/i });
    const saveButton = await screen.findByRole('button', { name: /save community/i });

    expect(saveButton).toBeDisabled();

    await user.type(nameInput, '   ');
    expect(saveButton).toBeDisabled();

    await user.clear(nameInput); // Clear input before typing valid name
    await user.type(nameInput, 'Valid Name');
    expect(saveButton).not.toBeDisabled();
  });
}); 