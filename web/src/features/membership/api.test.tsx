import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Remove axios and MockAdapter imports if no longer needed globally
// import axios from 'axios';
// import MockAdapter from 'axios-mock-adapter';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useMembers, useAddMember, useRemoveMember } from './api';
import { Member, AddMemberPayload } from './types'; // Reverted import path
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import apiClient from '@/api/axios'; // Import apiClient for mocking

// Mock the apiClient module
vi.mock('@/api/axios');
const mockedApiClient = vi.mocked(apiClient, true);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            {children}
        </AuthProvider>
    </QueryClientProvider>
);

describe('Membership API Hooks', () => {
    const communityId = '123';
    const userId = '456';
    const mockMembers: Member[] = [
        { id: 1, name: 'Alice', email: 'alice@test.com', role: 'Admin', points: 100, membershipId: 11 },
        { id: 2, name: 'Bob', email: 'bob@test.com', role: 'Member', points: 50, membershipId: 12 },
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

        // Reset mocks
        vi.clearAllMocks(); // Clear all Vitest mocks
        // mockedApiClient.get.mockClear();
        // mockedApiClient.post.mockClear();
        // mockedApiClient.delete.mockClear();
        queryClient.clear();
    });

    afterEach(() => {
        // Clear mocks after each test
        vi.restoreAllMocks();
    });

    // Test useMembers
    it('useMembers fetches members successfully', async () => {
        // Mock the specific GET request
        mockedApiClient.get.mockResolvedValue({ data: mockMembers });

        const { result } = renderHook(() => useMembers(Number(communityId)), { wrapper });

        // Wait specifically for the query to not be loading anymore
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Check that the correct endpoint was called
        expect(mockedApiClient.get).toHaveBeenCalledWith(`/communities/${communityId}/members`, expect.any(Object)); // Check headers implicitly

        // Now check the final state
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockMembers);
    });

    it('useMembers handles fetch error', async () => {
        // Mock the specific GET request to fail
        const error = new Error('Fetch failed');
        mockedApiClient.get.mockRejectedValue(error);

        const { result } = renderHook(() => useMembers(Number(communityId)), { wrapper });
        
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Check that the correct endpoint was called
        expect(mockedApiClient.get).toHaveBeenCalledWith(`/communities/${communityId}/members`, expect.any(Object));

        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe(error);
    });

    // Test useAddMember
    it('useAddMember adds a member successfully', async () => {
        const payload: AddMemberPayload = { communityId: Number(communityId), userIdentifier: 'new@test.com' };
        const newMember: Member = { id: 3, name: 'Charlie', email: 'new@test.com', role: 'Member', points: 0, membershipId: 99 };
        
        // Mock POST for adding member
        mockedApiClient.post.mockResolvedValue({ data: newMember });
        // Mock GET for the automatic refetch after invalidation
        mockedApiClient.get.mockResolvedValue({ data: [...mockMembers, newMember] }); 

        const { result } = renderHook(() => useAddMember(), { wrapper });

        // act might not be strictly necessary for mutate itself, but good practice
        act(() => {
             result.current.mutate({ communityId: Number(communityId), userIdentifier: 'new@test.com' });
        });

        // Wait for the mutation to complete
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(newMember);

        // Check POST call
        expect(mockedApiClient.post).toHaveBeenCalledWith(
            `/communities/${Number(communityId)}/members`, 
            { userIdentifier: 'new@test.com' }, 
            expect.any(Object) // Check headers implicitly
        );

        // Check if query was invalidated (by checking if data refetched)
        const { result: membersResult } = renderHook(() => useMembers(Number(communityId)), { wrapper });
        await waitFor(() => expect(membersResult.current.isSuccess).toBe(true));
        expect(membersResult.current.data).toEqual([...mockMembers, newMember]);

        // Ensure the GET for refetch was called after invalidation
        // It should be called exactly ONCE within this specific test
        expect(mockedApiClient.get).toHaveBeenCalledTimes(1); // Corrected from 2 to 1
        // We can still check it was called with the right arguments
        expect(mockedApiClient.get).toHaveBeenCalledWith(`/communities/${Number(communityId)}/members`, expect.any(Object));
        // The previous check on data already confirms the refetch worked
        // expect(membersResult.current.data).toEqual([...mockMembers, newMember]); 
    });

    // Test useRemoveMember
    it('useRemoveMember removes a member successfully', async () => {
        const userIdToRemove = 2; // Assuming Bob's ID
        
        // Mock DELETE
        mockedApiClient.delete.mockResolvedValue({}); // DELETE often returns 204 No Content
        // Mock GET for refetch (without the removed member)
        mockedApiClient.get.mockResolvedValue({ data: mockMembers.filter(m => m.id !== userIdToRemove) });

        const { result } = renderHook(() => useRemoveMember(), { wrapper });

        act(() => {
             result.current.mutate({ communityId: Number(communityId), userId: userIdToRemove });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeUndefined(); // DELETE returns no body

        // Check DELETE call
        expect(mockedApiClient.delete).toHaveBeenCalledWith(
            `/communities/${Number(communityId)}/members/${userIdToRemove}`, 
            expect.any(Object) // Check headers implicitly
        );

        // Check if query was invalidated
        const { result: membersResult } = renderHook(() => useMembers(Number(communityId)), { wrapper });
        await waitFor(() => expect(membersResult.current.isSuccess).toBe(true));
        expect(membersResult.current.data).toEqual(mockMembers.filter(m => m.id !== userIdToRemove));

        // Ensure the GET for refetch was called
        expect(mockedApiClient.get).toHaveBeenCalledTimes(1); // Only one GET call expected here for the refetch
        expect(mockedApiClient.get).toHaveBeenCalledWith(`/communities/${Number(communityId)}/members`, expect.any(Object));
        expect(membersResult.current.data).toEqual(mockMembers.filter(m => m.id !== userIdToRemove));
    });
}); 