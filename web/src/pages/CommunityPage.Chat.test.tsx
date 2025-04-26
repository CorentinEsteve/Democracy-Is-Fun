import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import CommunityPage from '@/pages/CommunityPage'; // Corrected import path
import * as ChatApi from '@/features/chat/api'; // Mock chat hooks
import * as ProposalApi from '@/features/proposals/api'; // Mock proposal hooks
import * as AuthContextModule from '@/contexts/AuthContext'; // Spy on useAuth
import { Message } from '@/features/chat/types';
import { Proposal } from '@/features/proposals/types';
import React from 'react';
// import apiClient from '@/api/axios'; // REMOVE apiClient import

// --- Mocks ---
// vi.mock('@/api/axios'); // REMOVE apiClient mock
// const mockedApiClient = vi.mocked(apiClient); // REMOVE apiClient mock

// RE-ADD direct hook mocks
const mockUseMessages = vi.spyOn(ChatApi, 'useMessages');
const mockUseCreateMessage = vi.spyOn(ChatApi, 'useCreateMessage');
const mockUseProposals = vi.spyOn(ProposalApi, 'useProposals');
const mockUseVoteOnProposal = vi.spyOn(ProposalApi, 'useVoteOnProposal');
const mockUseCreateProposal = vi.spyOn(ProposalApi, 'useCreateProposal');

// Mock useToast for potential errors in child components
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast, toasts: [] }),
}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } }, // Disable polling/retry for tests
});

const renderCommunityPageForChat = (communityId: string, authValue: any) => {
    vi.clearAllMocks(); // Use clearAllMocks for spies

    // Provide default mocks for hooks EXCEPT useMessages
    // mockUseMessages.mockReturnValue({ data: [], isLoading: true, isError: false, error: null } as any); // REMOVE Default for useMessages
    mockUseCreateMessage.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false } as any);
    mockUseProposals.mockReturnValue({ data: [], isLoading: false, isError: false, error: null } as any);
    mockUseVoteOnProposal.mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    mockUseCreateProposal.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false } as any);

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthContextModule.AuthProvider value={authValue}> {/* Assuming AuthProvider is exported */}
                <MemoryRouter initialEntries={[`/communities/${communityId}`]}>
                    <Routes>
                        <Route path="/communities/:communityId" element={<CommunityPage />} />
                    </Routes>
                </MemoryRouter>
            </AuthContextModule.AuthProvider>
        </QueryClientProvider>
    );
};

describe('CommunityPage - Chat Panel Integration', () => {
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const authValue = { user: mockUser, isLoading: false, login: vi.fn(), logout: vi.fn(), token: 'mock-token', isAuthenticated: true };
    const communityId = '123';

    beforeEach(() => {
        queryClient.clear(); // Clear react-query cache
        mockToast.mockClear();
        // mockedApiClient.get.mockClear(); // REMOVE
        // mockedApiClient.post.mockClear(); // REMOVE
        vi.clearAllMocks(); // Ensure mocks are cleared
    });

    it('renders loading state for messages initially', () => {
        // Set mock for this test
        mockUseMessages.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null } as any);
        renderCommunityPageForChat(communityId, authValue);
        expect(screen.getByTestId('loading-messages')).toBeInTheDocument();
    });

    it('renders message list and input when messages load successfully', async () => {
        const messages: Message[] = [
             { id: 1, content: 'Chat Msg 1', createdAt: new Date().toISOString(), communityId: parseInt(communityId), authorId: 1, author: { id: 1, name: 'Alice' } },
        ];
        // const proposals: Proposal[] = []; // Not needed when mocking hooks

        // Mock hook for this test
        mockUseMessages.mockReturnValue({ data: messages, isLoading: false, isError: false, error: null } as any);
        // Ensure proposals hook also returns success state if needed by the component
        mockUseProposals.mockReturnValue({ data: [], isLoading: false, isError: false, error: null } as any);
        
        renderCommunityPageForChat(communityId, authValue);

        // Wait for loading to disappear (for messages)
        await waitFor(() => {
          expect(screen.queryByTestId('loading-messages')).not.toBeInTheDocument();
        }, { timeout: 3000 });

        // Check for message content
        expect(screen.getByText(messages[0].content)).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();

        // Check for input elements
        expect(screen.getByPlaceholderText(/type your message here/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

     it('renders error state for messages on failure', async () => {
        const errorMsg = 'Fetch Failed';
        // const proposals: Proposal[] = []; // Not needed when mocking hooks

        // Mock hooks for this test
        mockUseMessages.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error(errorMsg) } as any);
        // Ensure proposals hook also returns success state if needed by the component
        mockUseProposals.mockReturnValue({ data: [], isLoading: false, isError: false, error: null } as any);

        renderCommunityPageForChat(communityId, authValue);

        // Wait for loading to disappear before checking for error
        await waitFor(() => {
          expect(screen.queryByTestId('loading-messages')).not.toBeInTheDocument();
        }, { timeout: 3000 });

        // Now check for the error message
        expect(screen.getByTestId('error-messages')).toBeInTheDocument();
        expect(screen.getByText(new RegExp(`Error loading messages: ${errorMsg}`, 'i'))).toBeInTheDocument(); // Use RegExp for flexibility
    });

    // Add more tests if needed, e.g., interaction between input and list
}); 