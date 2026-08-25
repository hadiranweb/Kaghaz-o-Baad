# Frontend State Alignment Contract — Sprint 11

## Auth Context State (Required)

- `user: FrontendUser | null`
- `session: FrontendSession | null`
- `loading: boolean`
- `signIn`, `signUp`, `signOut`, `sendPhoneOtp`, `verifyPhoneOtp`, `setSessionFromOtp`

## Type Alignment

- `FrontendUser` extends `BackendUser` with `user_metadata`
- `FrontendSession` extends `BackendSession` with `access_token` and mapped `user`
- `toFrontendUser` and `toSession` must be pure (no side effects)
- `setSessionFromOtp` must call `setToken` before setting session/user

## Isolation Guarantees

- Auth state does not depend on AI stack, billing, or mailbox workers
- `currentUser()` is the only source of truth for user identity
- `logout()` clears user, session, and token atomically
- `signUp` handles `pending` state with appropriate toast
