import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import MessageInput from './MessageInput';
import * as api from '../api'; // Import the API module
import { Toaster } from '@/components/ui/toaster'; // For toast messages
import React from 'react';

// Mock the useCreateMessage hook
const mockMutateAsync = vi.fn();
const mockUseCreateMessage = vi.spyOn(api, 'useCreateMessage').mockReturnValue({
  mutateAsync: mockMutateAsync,
  isPending: false,
} as any);

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, toasts: [] }),
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
    <Toaster />
  </QueryClientProvider>
);

const renderMessageInput = (communityId: number) => {
  const user = userEvent.setup();
  const utils = render(<MessageInput communityId={communityId} />, { wrapper });
  return { ...utils, user };
};

describe('MessageInput', () => {
  const communityId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return value if needed, especially for isPending
    mockUseCreateMessage.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
    } as any);
  });

  it('renders textarea and send button', () => {
    renderMessageInput(communityId);
    expect(screen.getByPlaceholderText(/type your message here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('calls createMessage mutation on submit with valid content', async () => {
    const messageContent = 'Hello World!';
    mockMutateAsync.mockResolvedValueOnce({}); // Simulate success
    const { user } = renderMessageInput(communityId);

    const textarea = screen.getByPlaceholderText(/type your message here/i);
    const button = screen.getByRole('button', { name: /send message/i });

    await user.type(textarea, messageContent);
    await user.click(button);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync).toHaveBeenCalledWith({ communityId, content: messageContent });
      expect(textarea).toHaveValue(''); // Check if form is reset
    });
  });

  it('calls createMessage mutation on Enter key press (without Shift)', async () => {
    const messageContent = 'Send on enter';
    mockMutateAsync.mockResolvedValueOnce({}); 
    const { user } = renderMessageInput(communityId);
    const textarea = screen.getByPlaceholderText(/type your message here/i);

    await user.type(textarea, messageContent);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync).toHaveBeenCalledWith({ communityId, content: messageContent });
      expect(textarea).toHaveValue(''); 
    });
  });
  
  it('does not submit on Shift+Enter key press', async () => {
    const { user } = renderMessageInput(communityId);
    const textarea = screen.getByPlaceholderText(/type your message here/i);

    await user.type(textarea, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'Line 2');

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('Line 1\nLine 2'); // Check for newline
  });

  it('shows validation error for empty message', async () => {
    const { user } = renderMessageInput(communityId);
    const button = screen.getByRole('button', { name: /send message/i });

    await user.click(button); // Click without typing

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByText(/message cannot be empty/i)).toBeInTheDocument();
  });

  it('disables input and button and shows loader when pending', async () => {
     // Update mock to simulate pending state
     mockUseCreateMessage.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
    } as any);

    renderMessageInput(communityId);

    const textarea = screen.getByPlaceholderText(/type your message here/i);
    const button = screen.getByRole('button', { name: /send message/i });

    expect(textarea).toBeDisabled();
    expect(button).toBeDisabled();
    expect(button.querySelector('.animate-spin')).toBeInTheDocument(); // Check for loader icon
  });

  it('shows toast notification on mutation error', async () => {
    const errorMsg = 'Network failed';
    mockMutateAsync.mockRejectedValueOnce(new Error(errorMsg));
    const { user } = renderMessageInput(communityId);
    const textarea = screen.getByPlaceholderText(/type your message here/i);
    const button = screen.getByRole('button', { name: /send message/i });

    await user.type(textarea, 'This will fail');
    await user.click(button);

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ 
            variant: "destructive",
            title: "Failed to send message",
            description: errorMsg
        }));
    });
  });
}); 