import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import MessageList from './MessageList';
import * as api from '../api'; // Import the API module
import { Message } from '../types';
import React from 'react';

// Mock the useMessages hook
const mockUseMessages = vi.spyOn(api, 'useMessages');

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderMessageList = (communityId: number) => {
  return render(<MessageList communityId={communityId} />, { wrapper });
};

describe('MessageList', () => {
  const communityId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders loading state initially', () => {
    mockUseMessages.mockReturnValue({ isLoading: true, data: undefined, isError: false, error: null } as any);
    renderMessageList(communityId);
    expect(screen.getByTestId('loading-messages')).toBeInTheDocument();
    expect(screen.queryByText(/error loading messages/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no messages yet/i)).not.toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorMsg = 'Failed to fetch';
    mockUseMessages.mockReturnValue({ isLoading: false, data: undefined, isError: true, error: new Error(errorMsg) } as any);
    renderMessageList(communityId);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
    expect(screen.getByText(`Error loading messages: ${errorMsg}`)).toBeInTheDocument();
    expect(screen.queryByTestId('loading-messages')).not.toBeInTheDocument();
  });

  it('renders "no messages yet" when data is empty', () => {
    mockUseMessages.mockReturnValue({ isLoading: false, data: [], isError: false, error: null } as any);
    renderMessageList(communityId);
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('loading-messages')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-messages')).not.toBeInTheDocument();
  });

  it('renders list of messages successfully', () => {
    const mockMessages: Message[] = [
      { id: 1, content: 'First message', createdAt: new Date(Date.now() - 60000).toISOString(), communityId, authorId: 1, author: { id: 1, name: 'Alice', avatarUrl: 'url1' } },
      { id: 2, content: 'Second message', createdAt: new Date().toISOString(), communityId, authorId: 2, author: { id: 2, name: 'Bob' } },
    ];
    mockUseMessages.mockReturnValue({ isLoading: false, data: mockMessages, isError: false, error: null } as any);

    renderMessageList(communityId);

    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // const aliceAvatar = screen.getByAltText('Alice') as HTMLImageElement; // Image might not load in JSDOM
    // expect(aliceAvatar.src).toContain('url1');
    expect(screen.getByText('A')).toBeInTheDocument(); // Check for fallback instead
    expect(screen.getAllByText(/ago/i).length).toBeGreaterThan(0); // Check that at least one timestamp is present

    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();

    expect(screen.queryByTestId('loading-messages')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-messages')).not.toBeInTheDocument();
    expect(screen.queryByText(/no messages yet/i)).not.toBeInTheDocument();
  });

  // Scrolling behavior is difficult to test reliably without visual inspection or complex mocks
}); 