import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import CommunityPage from './CommunityPage';
import * as AuthContextModule from '@/contexts/AuthContext';
import * as communitiesApi from '@/features/communities/api';
import * as proposalsApi from '@/features/proposals/api';
import { Community, Membership } from '@/features/communities/types';
import { MembershipRole } from '@/features/membership/types';
import { Proposal } from '@/features/proposals/types';
import { vi } from 'vitest';

// Import the actual context module and the hook
const useAuth = AuthContextModule.useAuth; // Alias if needed, but spyOn needs the module

// Mocks
vi.mock('@/features/proposals/api');
vi.mock('@/features/communities/api');
vi.mock('@/features/communities/components/CommunitySettingsModal', () => ({
    CommunitySettingsModal: ({ isOpen, onOpenChange, community }: any) => 
        isOpen ? (
            <div data-testid="mock-settings-modal">
                <h2>Community Settings for {community.name}</h2>
                <button onClick={() => onOpenChange(false)}>Close Mock Modal</button>
            </div>
        ) : null,
}));
vi.mock('@/features/members/components/ManageMembersModal', () => ({
    ManageMembersModal: () => <button>Mock Manage Members</button>,
}));
vi.mock('@/features/proposals/components/CreateProposalModal', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>, 
}));
vi.mock('@/features/chat/components/MessageList', () => ({
    default: () => <div data-testid="message-list">Message List Mock</div>,
}));
vi.mock('@/features/chat/components/MessageInput', () => ({
    default: () => <div data-testid="message-input">Message Input Mock</div>,
}));
vi.mock('@/features/proposals/components/ProposalList', () => ({
     default: () => <div data-testid="proposal-list">Proposal List Mock</div>,
}));

const mockUseCommunity = communitiesApi.useCommunity as vi.Mock;
const mockUseProposals = proposalsApi.useProposals as vi.Mock;
const mockUseVoteOnProposal = proposalsApi.useVoteOnProposal as vi.Mock;

const queryClient = new QueryClient();

const renderCommunityPage = (
    communityId: string,
    authUserData: AuthContextModule.AuthContextType['user'], // Use imported type
    communityData: Community | null,
    proposalsData: Proposal[] = []
) => {
    // Reset mocks for each render
    mockUseCommunity.mockReturnValue({ data: communityData, isLoading: false, error: null });
    mockUseProposals.mockReturnValue({ data: proposalsData, isLoading: false, error: null });
    mockUseVoteOnProposal.mockReturnValue({ mutate: vi.fn(), isPending: false });
    
    // Use vi.spyOn to mock useAuth for this render
    const authSpy = vi.spyOn(AuthContextModule, 'useAuth')
                      .mockReturnValue({ user: authUserData, isLoading: false, token: null, login: vi.fn(), logout: vi.fn() });

    const renderResult = render(
        <MemoryRouter initialEntries={[`/communities/${communityId}`]}>
            <QueryClientProvider client={queryClient}>
                 {/* Render the actual component, useAuth inside will be mocked by spyOn */}
                 <Routes>
                    <Route path="/communities/:communityId" element={<CommunityPage />} />
                </Routes>
            </QueryClientProvider>
        </MemoryRouter>
    );

    // Restore the original implementation after render if needed, or rely on beforeEach/afterEach
    // authSpy.mockRestore(); 

    return renderResult; 
};

describe('CommunityPage - Settings Button and Modal', () => {
    const communityId = '1';
    const memberUser = { id: 2, name: 'Test Member' }; 
    const adminUser = { id: 1, name: 'Test Admin' };

    const mockCommunityBase: Omit<Community, 'memberships'> = {
        id: parseInt(communityId), 
        name: 'Settings Test Community',
        description: '',
        imageUrl: null,
        creatorId: adminUser.id, 
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
    };

    beforeEach(() => {
        // Clear mocks before each test
        vi.clearAllMocks(); 
        // Restore any spies if they weren't restored in renderCommunityPage
        vi.restoreAllMocks(); 
        queryClient.clear();
    });

    it('does NOT show settings button for regular members', () => {
        const communityWithMember: Community = {
            ...mockCommunityBase,
            memberships: [
                { userId: memberUser.id, communityId: parseInt(communityId), role: MembershipRole.Member, points: 0, joinedAt: '' },
            ],
        };
        renderCommunityPage(communityId, { ...memberUser, id: String(memberUser.id) }, communityWithMember);
        expect(screen.queryByRole('button', { name: /Community Settings/i })).not.toBeInTheDocument();
    });

    it('shows settings button for admins', () => {
         const communityWithAdmin: Community = {
            ...mockCommunityBase,
            memberships: [
                { userId: adminUser.id, communityId: parseInt(communityId), role: MembershipRole.Admin, points: 0, joinedAt: '' },
            ],
        };
        renderCommunityPage(communityId, { ...adminUser, id: String(adminUser.id) }, communityWithAdmin);
        expect(screen.getByRole('button', { name: /Community Settings/i })).toBeInTheDocument();
    });

    it('opens settings modal when admin clicks settings button', async () => {
         const communityWithAdmin: Community = {
            ...mockCommunityBase,
            memberships: [
                 { userId: adminUser.id, communityId: parseInt(communityId), role: MembershipRole.Admin, points: 0, joinedAt: '' },
            ],
        };
        renderCommunityPage(communityId, { ...adminUser, id: String(adminUser.id) }, communityWithAdmin);

        const settingsButton = screen.getByRole('button', { name: /Community Settings/i });
        expect(screen.queryByTestId('mock-settings-modal')).not.toBeInTheDocument(); 

        fireEvent.click(settingsButton);

        await waitFor(() => {
            expect(screen.getByTestId('mock-settings-modal')).toBeInTheDocument();
        });
        expect(screen.getByText(`Community Settings for ${communityWithAdmin.name}`)).toBeInTheDocument();
        
        fireEvent.click(screen.getByRole('button', { name: /Close Mock Modal/i }));
        await waitFor(() => {
             expect(screen.queryByTestId('mock-settings-modal')).not.toBeInTheDocument();
        });
    });
     it('does not show settings button if user is not logged in', () => {
        const communityWithMembers: Community = {
            ...mockCommunityBase,
            memberships: [
                { userId: adminUser.id, communityId: parseInt(communityId), role: MembershipRole.Admin, points: 0, joinedAt: '' }, 
            ],
        };
        renderCommunityPage(communityId, null, communityWithMembers); 
        expect(screen.queryByRole('button', { name: /Community Settings/i })).not.toBeInTheDocument();
    });

     it('does not show settings button if community data is loading or unavailable', () => {
         mockUseCommunity.mockReturnValue({ data: null, isLoading: true, error: null }); 
         renderCommunityPage(communityId, { ...adminUser, id: String(adminUser.id) }, null); 
         expect(screen.queryByRole('button', { name: /Community Settings/i })).not.toBeInTheDocument();
         
         mockUseCommunity.mockReturnValue({ data: null, isLoading: false, error: null });
         renderCommunityPage(communityId, { ...adminUser, id: String(adminUser.id) }, null);
         expect(screen.queryByRole('button', { name: /Community Settings/i })).not.toBeInTheDocument();
     });
}); 