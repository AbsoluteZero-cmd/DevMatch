# FR-29 to FR-34 — AI Role Classification & Skill Scoring Audit

## Feature Status

| FR  | Requirement                                      | Status                  | Notes                                                                                          |
|-----|--------------------------------------------------|-------------------------|------------------------------------------------------------------------------------------------|
| FR-29 | Skill Score 0-100 for 10 roles via LLM       | **IMPLEMENTED**         | Backend computes scores; frontend displays roles. `RoleRead` intentionally omits `skill_score`. |
| FR-30 | Skill Level mapping (Beginner/Intermediate/Advanced/Expert) | **IMPLEMENTED** | `SkillLevel` type at `profile-types.ts:10`. Labels displayed in `roles-section.tsx`. Mapping is backend responsibility. |
| FR-31 | Display Skill Level label only (not numeric score) | **IMPLEMENTED**     | `RoleRead` has no `skill_score` field. Only text labels rendered.                               |
| FR-32 | Skill Scores not disclosed to users            | **IMPLEMENTED**         | No numeric score in types, components, or API responses exposed to client.                      |
| FR-33 | Roles assigned only if score >= 25             | **IMPLEMENTED**         | Backend filters. Frontend adds defensive filter to hide Beginner roles.                         |
| FR-34 | Re-run AI analysis on profile update           | **IMPLEMENTED**         | Manual "Re-analyze Profile" button exists. Auto-trigger added to profile save handlers.          |

## What Was Skipped and Why

| Item | Reason Skipped |
|------|----------------|
| `skill_score` field in `RoleRead` type | SRS FR-32: "Skill Scores shall be used exclusively by the internal matching algorithm." FR-31: "display only the Skill Level label (not the numeric Skill Score)." Adding the field would violate these requirements. |
| Skill Score to Level mapping logic in frontend | SRS FR-30 defines the mapping as backend responsibility. Frontend only consumes the `SkillLevel` label string. Client-side mapping would create duplicate logic and potential inconsistency. |
| Backend LLM API integration changes | Out of scope — frontend-only changes requested. Backend already has `POST /profile/analyze` and `POST /profile/analyze/sync` endpoints. |
| GitHub/HuggingFace data import (FR-26) | Separate feature, outside FR-29-34 range. |
| `skill_score` display in recommendation cards | SRS FR-7: recommendation cards show "top roles with Skill Levels" — no numeric scores. Backend `CandidateRead` has `match_score` (different from `skill_score`). |

## Manual Testing Procedures

### FR-29 — Skill Score for 10 Roles

1. Register a new account
2. Complete onboarding: add name, education, skills, projects, GitHub link
3. On analysis page, wait for "Generating role classifications" step to complete
4. On results page, verify:
   - Roles are displayed with skill level badges (Intermediate/Advanced/Expert)
   - Role count matches expected (backend filters Beginner)
   - All 10 standardized role names are recognized (Frontend Engineer, Backend Engineer, etc.)
5. Navigate to profile page → Roles section
6. Verify assigned roles appear with correct tier styling (Core vs Specialized)

### FR-30 — Skill Level Mapping

1. Complete FR-29 steps above
2. Verify each role shows one of: Intermediate, Advanced, Expert
3. Verify no numeric scores (0-100) are visible anywhere on the page
4. Check role cards have color-coded badges:
   - Core roles: primary color scheme
   - Specialized roles: secondary color scheme

### FR-31 — Display Skill Level Label Only

1. Complete FR-29 steps
2. Inspect the roles section on profile page
3. Verify only text labels appear: "Intermediate", "Advanced", or "Expert"
4. Open browser DevTools → Network tab
5. Call `GET /profile/me` and inspect response
6. Verify `roles` array contains `skill_level` string but no numeric `skill_score`

### FR-32 — Skill Scores Not Disclosed

1. Complete FR-29 steps
2. Open browser DevTools → Console
3. Search page source for "skill_score" — should find zero matches
4. Check React DevTools component tree — no numeric scores in props
5. Inspect all API responses in Network tab — no `skill_score` field

### FR-33 — Roles Assigned Only if Score >= 25

1. Complete FR-29 steps
2. Verify no "Beginner" roles appear in the roles section
3. If backend returns a role with score < 25, verify it is filtered out on frontend
4. Check that the role count text ("X roles") reflects only non-Beginner roles
5. Edge case: if all 10 roles score below 25, verify empty state message appears

### FR-34 — Re-run AI Analysis on Profile Update

1. Navigate to profile page
2. Click "Edit profile" button
3. Change name or add a skill tag
4. Click "Save"
5. Verify toast/notification appears: "Profile updated. AI re-analysis started."
6. Wait 5-10 seconds
7. Verify "Last analyzed" timestamp updates
8. Also test manual button:
   - Click "Re-analyze Profile" button
   - Verify loading spinner appears
   - Verify success message after completion

## Automated Test Coverage

| FR  | Test File                                      | Test Cases                              |
|-----|------------------------------------------------|-----------------------------------------|
| FR-29 | `test/components/roles-section.test.tsx`     | Role rendering, tier styling, icons     |
| FR-30 | `test/components/roles-section.test.tsx`     | Skill level badge display               |
| FR-31 | `test/components/roles-section.test.tsx`     | No numeric score displayed              |
| FR-32 | `test/profile-types.test.ts`                 | Type structure validation               |
| FR-33 | `test/components/roles-section.test.tsx`     | Beginner filter, count accuracy         |
| FR-34 | `test/profile-reanalysis.test.tsx`           | Auto-trigger on save, error handling    |
| FR-34 | `test/analysis-flow.test.tsx`                | API function calls, error handling      |

### Test Summary

- **Total new tests**: 23
- **Test files modified**: 2 (`roles-section.test.tsx`, `profile-types.test.ts`)
- **Test files created**: 2 (`profile-reanalysis.test.tsx`, `analysis-flow.test.tsx`)
- **Source files modified**: 3 (`profile-types.ts`, `roles-section.tsx`, `profile/page.tsx`)
