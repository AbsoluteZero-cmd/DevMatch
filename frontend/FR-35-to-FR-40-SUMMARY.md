# FR-35 to FR-40 — Implementation Summary

## Feature Status

| FR   | Description                              | Status         | Skipped? | Reason                                          |
|------|------------------------------------------|----------------|----------|-------------------------------------------------|
| FR-35 | Create team (name, goal, description)   | IMPLEMENTED    | No       |                                                 |
| FR-36 | Creator designated as Team Leader       | IMPLEMENTED    | Yes      | Backend sets `leader_id` automatically          |
| FR-37 | Add unregistered members                | IMPLEMENTED    | No       | Fixed: added experience_description field       |
| FR-38 | 50% weighting for unregistered members  | IMPLEMENTED    | Yes      | Backend computes weighting in recommendation_service.py |
| FR-39 | Team visibility Public/Private          | IMPLEMENTED    | No       |                                                 |
| FR-40 | Team capability profile calculation     | IMPLEMENTED    | No       |                                                 |

## What Was Skipped and Why

### FR-36 — Creator = Team Leader
Backend handles this entirely. When `POST /teams` is called, the backend sets `leader_id=current_user.id` in `backend/app/api/team.py:315`. No frontend code needed.

### FR-38 — 50% Weighting for Unregistered Members
Backend-only calculation. The `compute_team_capability()` function in `backend/app/services/recommendation_service.py:103-110` applies `declared * 0.5` for unregistered members. No frontend code needed.

## What Was Fixed

### FR-37 — Experience Description Field
**Problem:** The `experience_description` field was hardcoded to `undefined` in the `submitAddMember` function, and the Manage Members dialog form had no input for it.

**Fix:** Added a `Textarea` input for "Experience description" to the Manage Members dialog, wired it to the API call, and added form reset after successful submission.

**File:** `frontend/app/(main)/dashboard/page.tsx`

## Manual Testing Steps

### FR-35 — Create Team
1. Log in as a Team Leader
2. Navigate to `/dashboard`
3. Click **"New Team"** button (top-right)
4. Verify dialog opens with fields: Team Name, Development Goal, Description, Visibility
5. Leave Team Name empty, click **"Create Team"** → verify error "Team name is required."
6. Fill in Team Name = "Test Team", Development Goal = "Build an app", Description = "Mobile team"
7. Select Visibility = "PUBLIC"
8. Click **"Create Team"** → verify dialog closes, new team appears in team selector
9. Verify team name, goal, and description are all displayed separately in the Selected Team section

### FR-37 — Add Unregistered Members
1. Log in as a Team Leader with at least one team
2. Navigate to `/dashboard`
3. Click **"Manage Members"** button (top-right)
4. Verify dialog opens showing current members list
5. Verify form has fields: Full name, Role, Experience description, Skill level
6. Fill in Full name = "Charlie", Role = "Designer", Experience description = "5 years UI/UX"
7. Select Skill level = "Advanced"
8. Click **"Add member"** → verify member appears in the members list
9. Verify form fields reset to empty after submission
10. Verify the new member shows on the team dashboard in the members section

### FR-39 — Team Visibility
1. Create a team with Visibility = "PUBLIC" → verify badge shows "PUBLIC" on dashboard
2. Create a team with Visibility = "PRIVATE" → verify badge shows "PRIVATE" on dashboard
3. Verify visibility is also shown as uppercase text in the Selected Team section
4. Switch between teams using the team selector → verify visibility badge updates

### FR-40 — Team Capability Profile
1. Navigate to `/dashboard` with a team selected
2. Verify "Team Analytics" section appears in the right sidebar
3. Verify "Overall Level" shows a label (Beginner/Intermediate/Advanced/Expert)
4. Verify a progress bar is displayed below the level
5. Verify "Team capability" text appears below the level label

### Cross-cutting — Dashboard Display
1. Verify team name is displayed prominently in the Selected Team section
2. Verify member count badge shows correct count (e.g., "2 members")
3. Verify "Development Goal" and "Project Description" are shown as separate labeled sections
4. Verify "Leader: [name]" badge is shown
5. Verify posting count badge shows correct count (e.g., "1 postings")

## Automated Tests

### Test File
`frontend/test/dashboard.test.tsx`

### How to Run
```bash
# Run all tests
npm test

# Run only dashboard tests
npx vitest run test/dashboard.test.tsx

# Run in watch mode during development
npx vitest test/dashboard.test.tsx
```

### Test Coverage (20 tests)

| Category                    | Tests | What's Tested                                          |
|-----------------------------|-------|--------------------------------------------------------|
| FR-35: Create Team          | 5     | Button renders, dialog opens, form fields, validation, API call |
| FR-37: Add Unregistered Members | 5 | Button renders, dialog opens, form fields, API call with experience, form reset |
| FR-39: Team Visibility      | 3     | PUBLIC badge, PRIVATE badge, visibility select options  |
| FR-40: Team Capability      | 3     | Analytics section, progress bar, 403 error handling     |
| Cross-cutting               | 4     | Team name, member count, goal/description separate, leader name, posting count |
