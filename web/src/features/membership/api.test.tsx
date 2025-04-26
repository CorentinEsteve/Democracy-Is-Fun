import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import { useMembers, useAddMember, useRemoveMember } from './api';
import { Member, AddMemberPayload } from './types';
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import apiClient from '@/api/axios';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const mockApiClient = new MockAdapter(apiClient);

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            {children}
        </AuthProvider>
    </QueryClientProvider>
);

describe('Membership API Hooks', () => {
    const communityId = 123;
    const userId = 'user-456';
    const mockMembers: Member[] = [
        { id: 'user-1', name: 'Alice', email: 'alice@test.com', role: 'Admin', points: 100 },
        { id: 'user-2', name: 'Bob', email: 'bob@test.com', role: 'Member', points: 50 },
    ];
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const mockToken = 'mock-test-token';

    beforeEach(() => {
        // Mock localStorage before each test
        Storage.prototype.getItem = vi.fn((key) => {
            if (key === 'authToken') return mockToken;
            if (key === 'authUser') return JSON.stringify(mockUser);
            return null;
        });
        Storage.prototype.setItem = vi.fn();
        Storage.prototype.removeItem = vi.fn();

        mockApiClient.reset();
        queryClient.clear();
    });

    afterEach(() => {
        // Clear mocks after each test
        vi.restoreAllMocks();
    });

    // Test useMembers
    it('useMembers fetches members successfully', async () => {
        mockApiClient.onGet(`/communities/${communityId}/members`).reply(200, mockMembers);

        const { result } = renderHook(() => useMembers(communityId), { wrapper });

        // Wait specifically for the query to not be loading anymore
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Now check the final state
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockMembers);
    });

    it('useMembers handles fetch error', async () => {
        mockApiClient.onGet(`/communities/${communityId}/members`).reply(500);

        const { result } = renderHook(() => useMembers(communityId), { wrapper });
        
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.isError).toBe(true);
    });

    // Test useAddMember
    it('useAddMember adds a member successfully', async () => {
        const payload: AddMemberPayload = { userIdentifier: 'new@test.com' };
        const newMember: Member = { id: 'user-3', name: 'Charlie', email: 'new@test.com', role: 'Member', points: 0 };
        
        // Mock POST for adding member
        mockApiClient.onPost(`/communities/${communityId}/members`, payload).reply(201, newMember);
        // Mock GET for refetch after invalidation
        mockApiClient.onGet(`/communities/${communityId}/members`).reply(200, [...mockMembers, newMember]);

        const { result } = renderHook(() => useAddMember(), { wrapper });

        // act might not be strictly necessary for mutate itself, but good practice
        act(() => {
             result.current.mutate({ communityId: communityId, userIdentifier: 'new@test.com' });
        });

        // Wait for the mutation to complete
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(newMember);

        // Check if query was invalidated (by checking if data refetched)
        // Re-render the hook to check the updated query data
        const { result: membersResult } = renderHook(() => useMembers(communityId), { wrapper });
        await waitFor(() => expect(membersResult.current.isSuccess).toBe(true));
        expect(membersResult.current.data).toEqual([...mockMembers, newMember]); 
    });

    // Test useRemoveMember
    it('useRemoveMember removes a member successfully', async () => {
        const userIdToRemove = 'user-2';
        mockApiClient.onDelete(`/communities/${communityId}/members/${userIdToRemove}`).reply(204);
         // Mock refetch after invalidation (without the removed member)
        mockApiClient.onGet(`/communities/${communityId}/members`).reply(200, mockMembers.filter(m => m.id !== userIdToRemove));

        const { result } = renderHook(() => useRemoveMember(), { wrapper });

        act(() => {
             result.current.mutate({ communityId: communityId, userId: userIdToRemove });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeUndefined(); // DELETE returns no body

        // Check if query was invalidated
        const { result: membersResult } = renderHook(() => useMembers(communityId), { wrapper });
        await waitFor(() => expect(membersResult.current.isSuccess).toBe(true));
        expect(membersResult.current.data).toEqual(mockMembers.filter(m => m.id !== userIdToRemove));
    });
}); 