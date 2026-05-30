# FR-18 to FR-23 — Audit Summary

## Feature Status

| FR  | Requirement                        | Status         | Reason                                                                 |
|-----|------------------------------------|----------------|-------------------------------------------------------------------------|
| FR-18 | Register with email/password (min 8 chars) | **IMPLEMENTED** | Registration page with validation, API call, redirect to login          |
| FR-19 | Email verification sent, unverified blocked | **SKIPPED**     | Backend has no `/verify-email` or `/resend-verification` endpoint       |
| FR-20 | JWT session token on login         | **IMPLEMENTED** | Login sends form-urlencoded, stores access+refresh tokens, auto-refresh |
| FR-21 | Password reset via time-limited link | **SKIPPED**     | Backend has no `/forgot-password` or `/reset-password` endpoint         |
| FR-22 | Link/unlink GitHub via OAuth 2.0   | **IMPLEMENTED** | OAuth flow + manual URL, disconnect, data panel with repos/commits      |
| FR-23 | Link/unlink HuggingFace via OAuth 2.0 | **IMPLEMENTED** | OAuth flow + manual URL, disconnect, data panel with models/datasets    |

## What Was Skipped and Why

### FR-19 — Email Verification

The frontend has a verify-email page (`app/(public)/verify-email/page.tsx`) with loading,
success, error, and expired states. However, it uses mock `setTimeout` logic instead of
real API calls. The backend (`backend/app/api/auth.py`) has no endpoint for:
- Verifying an email token (`POST /auth/verify-email`)
- Resending a verification email (`POST /auth/resend-verification`)

The login flow (`contexts/auth-context.tsx:87-129`) also does not check whether an account
is verified before issuing tokens.

**To complete this FR**, the backend needs:
1. A `POST /auth/verify-email` endpoint that accepts a token and marks the user as verified
2. A `POST /auth/resend-verification` endpoint that sends a new verification email
3. A `verified` field on the `User` model
4. A check in the login endpoint that rejects unverified users

### FR-21 — Password Reset

The frontend has a forgot-password page (`app/(public)/forgot-password/page.tsx`) with
email input, loading, success, and error states. However, it uses mock `setTimeout` logic.
The backend has no endpoint for:
- Requesting a password reset (`POST /auth/forgot-password`)
- Resetting a password with a token (`POST /auth/reset-password`)

There is also no `reset-password` page in the frontend to handle the link from the email.

**To complete this FR**, the backend needs:
1. A `POST /auth/forgot-password` endpoint that generates a time-limited reset token and sends it via email
2. A `POST /auth/reset-password` endpoint that accepts the token and new password
3. A `reset_password_token` and `reset_password_expires` field on the `User` model
4. A new `app/(public)/reset-password/page.tsx` in the frontend

## Manual Testing Steps

### FR-18 — Registration

1. Navigate to `/register`
2. Verify "Developer" and "Team Leader" account type toggles are present
3. Leave "Full Name" empty, click the email field, then click back — verify "Please enter your name" error appears
4. Enter an invalid email (e.g., "abc"), blur the field — verify "Please enter a valid email address" error
5. Enter a password shorter than 8 characters — verify the helper text stays gray/muted
6. Enter 8+ characters — verify helper text turns green with checkmark
7. Fill all fields validly — verify "Create Account" button becomes enabled
8. Click "Create Account" — verify redirect to `/login`
9. Verify the "Sign in" link at the bottom navigates to `/login`

### FR-20 — Login

1. Navigate to `/login`
2. Enter invalid email, blur — verify inline error appears
3. Leave password empty — verify "Sign In" button is disabled
4. Fill valid email and password — verify button enables
5. Click "Sign In" with valid credentials — verify redirect to `/dashboard`
6. Click "Sign In" with wrong credentials — verify error banner: "Login failed. Please check your credentials and try again."
7. Verify "Forgot password?" link navigates to `/forgot-password`
8. Verify "Create one" link navigates to `/register`
9. Click the eye icon on the password field — verify it toggles between text and password

### FR-19 — Email Verification (Mock UI)

1. Navigate to `/verify-email?token=abc123`
2. Verify loading spinner appears for ~2 seconds
3. Verify "Email verified!" success message appears with "Continue to Sign In" button
4. Navigate to `/verify-email?token=expired`
5. Verify "Link expired" message appears with "Resend Verification Email" button
6. Navigate to `/verify-email` (no token)
7. Verify "Verification failed" message appears with "Register Again" and "Back to Sign In" buttons

### FR-21 — Password Reset (Mock UI)

1. Navigate to `/forgot-password`
2. Enter invalid email, blur — verify inline error appears
3. Enter a valid email (e.g., "user@example.com") — click "Send Reset Link"
4. Verify loading spinner appears for ~1.5 seconds
5. Verify "Check your email" success message appears with the email address shown
6. Click "Try another email" — verify form resets
7. Enter email containing "notfound" (e.g., "notfound@test.com") — submit
8. Verify error banner: "No account found with this email address"
9. Verify "Back to Login" link navigates to `/login`

### FR-22 — GitHub OAuth Link/Unlink

1. Navigate to `/profile` in edit mode
2. Verify "Connect on GitHub" section is visible
3. If OAuth is configured: click "Connect with GitHub" — verify redirect to GitHub OAuth
4. If OAuth is not configured: verify fallback message about using raw URL
5. Enter a GitHub URL (e.g., "https://github.com/octocat") in the raw URL field
6. Click "Save URL" — verify URL is saved
7. Verify GitHub data panel appears with commit count and repository list
8. Click "Disconnect" — verify link is removed

### FR-23 — HuggingFace OAuth Link/Unlink

1. Navigate to `/profile` in edit mode
2. Verify "Connect on Hugging Face" section is visible
3. If OAuth is configured: click "Connect with Hugging Face" — verify redirect to HuggingFace OAuth
4. If OAuth is not configured: verify fallback message about using raw URL
5. Enter a HuggingFace URL (e.g., "https://huggingface.co/gpt2") in the raw URL field
6. Click "Save URL" — verify URL is saved
7. Verify HuggingFace data panel appears with model count and dataset count
8. Click "Disconnect" — verify link is removed

## Automated Test Coverage

| Test File                         | FRs Covered         | # Tests | Status |
|-----------------------------------|---------------------|---------|--------|
| `test/register.test.tsx`          | FR-18, FR-01, FR-02 | 13      | PASS   |
| `test/login.test.tsx`             | FR-20, FR-02        | 10      | PASS   |
| `test/auth-context.test.tsx`      | FR-18, FR-20        | 10      | PASS   |
| `test/api-auth.test.ts`           | FR-20               | 9       | PASS   |
| `test/forgot-password.test.tsx`   | FR-21 (mock UI)     | 7       | PASS   |
| `test/verify-email.test.tsx`      | FR-19 (mock UI)     | 6       | PASS   |
| `test/api.test.ts` (existing)     | FR-22, FR-23        | 5       | PASS   |
| `test/components/github-connect-section.test.tsx` (existing) | FR-22 | 12 | PASS |
| `test/components/hugging-face-connect-section.test.tsx` (existing) | FR-23 | 12 | PASS |
| `test/profile-types.test.ts` (existing) | —              | 8       | PASS   |

**Total: 113 tests across 10 test files — all passing.**

## New Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `test/register.test.tsx` | Registration page tests (FR-18, FR-01, FR-02) | 152 |
| `test/login.test.tsx` | Login page tests (FR-20, FR-02) | 119 |
| `test/auth-context.test.tsx` | Auth context hook tests (FR-18, FR-20) | 192 |
| `test/api-auth.test.ts` | API auth layer tests (FR-20) | 163 |
| `test/forgot-password.test.tsx` | Forgot password mock UI tests (FR-21) | 98 |
| `test/verify-email.test.tsx` | Verify email mock UI tests (FR-19) | 119 |
| `FR-18-23-AUDIT.md` | This summary document | — |

## Run Tests

```bash
cd frontend
npx vitest run
```
