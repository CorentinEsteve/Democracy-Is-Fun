- **Error**: Multiple Linter Errors (Incorrect hook names, type locations, inconsistent ID types)
  - **Context**: `web/src/pages/CommunityPage.tsx` (Integrating `CommunitySettingsModal`)
  - **Fix**: Corrected hook name to `useCommunity`, imported `Membership` from `communities/types`, imported `MembershipRole` from `membership/types`, parsed `communityIdParam` to number (`communityId`), handled potential string/number mismatch for `currentUserId`.

- **Error**: `Failed to resolve import "@/ui/textarea"`
  - **Context**: Vite/Vitest build/test errors involving `web/src/features/communities/components/CommunitySettingsModal.tsx`.
  - **Fix**: Corrected import path alias from `@/ui/textarea` to `@/components/ui/textarea`.

- **Error**: Vitest Syntax Error `ERROR: Expected ">" but found "client"`
  - **Context**: `web/src/features/communities/api.test.ts` (In `createWrapper` function).
  - **Fix**: Added explicit `return` statement for the JSX in the `createWrapper`'s inner function.

- **Error**: Vitest Mocking Error `TypeError: Cannot read properties of undefined (reading 'Provider')`
  - **Context**: `web/src/pages/CommunityPage.Settings.test.tsx` (Mocking `AuthContext`).
  - **Fix**: Switched from mocking via `AuthContext.Provider` to mocking the `useAuth` hook directly using `vi.spyOn(AuthContextModule, 'useAuth')` inside the test helper function.

- **Error**: Vitest Mocking Error `No "default" export is defined on the "@/features/proposals/components/CreateProposalModal" mock`
  - **Context**: `web/src/pages/CommunityPage.Settings.test.tsx` (Mocking `CreateProposalModal`).
  - **Fix**: Updated the `vi.mock` factory for `CreateProposalModal` to export the mock component as `default`.

- **Error**: Vitest Hoisting Error `ReferenceError: Cannot access 'mockUseAuth' before initialization`
  - **Context**: `web/src/pages/CommunityPage.Settings.test.tsx` (Using `vi.mock` for `useAuth`).
  - **Fix**: Abandoned `vi.mock` for `useAuth` and used `vi.spyOn` instead within the test setup function to avoid hoisting problems.

- **Error**: Testing Library Error `Unable to find an accessible element with the role "button" and name /Community Settings/i`
  - **Context**: `web/src/pages/CommunityPage.Settings.test.tsx` (Admin user test).
  - **Fix**: Corrected the test setup to use consistent, numeric IDs for mock users and their corresponding memberships, ensuring the `isAdmin` check (`m.userId === currentUserId`) compared numbers correctly after parsing the string ID from the (mocked) auth context.

- **Error**: Radix UI/Shadcn Warning `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {DialogContent}`
  - **Context**: Runtime warning in `web/src/features/communities/components/CommunitySettingsModal.tsx`.
  - **Fix**: Added a `<DialogDescription>` component within the `<DialogHeader>` for accessibility.

- **Error**: API Request Error `PUT /communities/:id 404 (Not Found)`
  - **Context**: Runtime error when saving changes in `CommunitySettingsModal`.
  - **Fix**: Changed the HTTP method in the `useUpdateCommunity` hook (`web/src/features/communities/api.ts`) from `apiClient.put` to `apiClient.patch` to match the backend route definition found in `api/src/modules/community/routes.ts`.
