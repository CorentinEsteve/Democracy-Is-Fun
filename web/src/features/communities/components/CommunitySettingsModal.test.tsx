import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom'; // Needed for useNavigate
import { CommunitySettingsModal } from './CommunitySettingsModal';
import * as apiHooks from '../api'; // Import hooks to mock
import { Community } from '../types';
import { vi } from 'vitest';

// Mock hooks from ../api
const mockUpdateCommunity = vi.fn();
const mockDeleteCommunity = vi.fn();
vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal() as typeof apiHooks;
  return {
    ...actual, // Keep other exports if any
    useUpdateCommunity: () => ({ mutateAsync: mockUpdateCommunity, isPending: false }),
    useDeleteCommunity: () => ({ mutateAsync: mockDeleteCommunity, isPending: false }),
  };
});

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>; // Use Record<string, unknown> for generic object
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const queryClient = new QueryClient();

const renderModal = (community: Community, isOpen = true, onOpenChange = vi.fn()) => {
  return render(
    <BrowserRouter> { /* Required for useNavigate */}
      <QueryClientProvider client={queryClient}>
        <CommunitySettingsModal 
          community={community} 
          isOpen={isOpen} 
          onOpenChange={onOpenChange} 
        />
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('CommunitySettingsModal', () => {
  const mockCommunity: Community = {
    id: 1,
    name: 'Original Name',
    description: 'Original Desc',
    imageUrl: 'http://original.com/img.png',
    creatorId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders prefilled form fields when open', () => {
    renderModal(mockCommunity);

    expect(screen.getByLabelText(/Name/i)).toHaveValue(mockCommunity.name);
    expect(screen.getByLabelText(/Description/i)).toHaveValue(mockCommunity.description);
    expect(screen.getByLabelText(/Image URL/i)).toHaveValue(mockCommunity.imageUrl);
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Community/i })).toBeInTheDocument();
  });

  it('calls update mutation on Save Changes with correct payload', async () => {
    const onOpenChangeMock = vi.fn();
    renderModal(mockCommunity, true, onOpenChangeMock);

    const newName = 'Updated Name';
    const newDesc = 'Updated Desc';
    const newUrl = 'http://new.com/img.png';

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: newName } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: newDesc } });
    fireEvent.change(screen.getByLabelText(/Image URL/i), { target: { value: newUrl } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateCommunity).toHaveBeenCalledTimes(1);
      expect(mockUpdateCommunity).toHaveBeenCalledWith({
        id: mockCommunity.id,
        name: newName,
        description: newDesc,
        imageUrl: newUrl,
      });
    });
     // Assuming update is successful
    await waitFor(() => expect(onOpenChangeMock).toHaveBeenCalledWith(false));

  });

  it('calls delete mutation on Delete Community and navigates on success', async () => {
     const onOpenChangeMock = vi.fn();
     renderModal(mockCommunity, true, onOpenChangeMock);

     // Simulate successful deletion
     mockDeleteCommunity.mockResolvedValueOnce(undefined);

     fireEvent.click(screen.getByRole('button', { name: /Delete Community/i }));

     await waitFor(() => {
       expect(mockDeleteCommunity).toHaveBeenCalledTimes(1);
       expect(mockDeleteCommunity).toHaveBeenCalledWith(mockCommunity.id);
     });
     
    // Wait for navigation and modal close
     await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/communities'));
     await waitFor(() => expect(onOpenChangeMock).toHaveBeenCalledWith(false));
  });

  it('closes modal on Cancel button click', () => {
    const onOpenChangeMock = vi.fn();
    renderModal(mockCommunity, true, onOpenChangeMock);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(onOpenChangeMock).toHaveBeenCalledTimes(1);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    expect(mockUpdateCommunity).not.toHaveBeenCalled();
    expect(mockDeleteCommunity).not.toHaveBeenCalled();
  });

   it('disables Save button if form is unchanged', () => {
    renderModal(mockCommunity);
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();

    // Make a change
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New Name' } });
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeEnabled();

     // Revert change
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: mockCommunity.name } });
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
  });

  // Add tests for loading states and error handling if needed

}); 