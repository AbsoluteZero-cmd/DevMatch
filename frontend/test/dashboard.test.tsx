import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/(main)/dashboard/page.tsx";
import type { TeamSummary, TeamCapabilityRead, CandidateRead } from "@/lib/api";

const mockTeams: TeamSummary[] = [
  {
    id: "team-1",
    name: "Alpha Squad",
    development_goal: "Build a rocket",
    description: "A team of rocket scientists",
    visibility: "PUBLIC",
    leader_id: 1,
    created_at: "2026-01-01T00:00:00Z",
    members: [
      {
        id: 100,
        is_registered: true,
        user_id: 1,
        assigned_role: "Frontend Engineer",
        unregistered_name: null,
        unregistered_role_description: null,
      },
      {
        id: 101,
        is_registered: false,
        user_id: null,
        assigned_role: "Design Lead",
        unregistered_name: "Bob",
        unregistered_role_description: "Designer",
      },
    ],
    job_postings: [
      {
        id: "posting-1",
        title: "Frontend Dev",
        required_role: "Frontend Engineer",
        role_description: "Build UI",
        min_skill_level: "Intermediate",
        status: "OPEN",
        is_public: true,
        created_at: "2026-01-02T00:00:00Z",
      },
    ],
  },
  {
    id: "team-2",
    name: "Private Team",
    development_goal: null,
    description: null,
    visibility: "PRIVATE",
    leader_id: 2,
    created_at: "2026-01-03T00:00:00Z",
    members: [],
    job_postings: [],
  },
];

const mockCapability: TeamCapabilityRead = {
  team_id: "team-1",
  member_count: 2,
  roles: { "Frontend Engineer": "Advanced" },
  overall_label: "Advanced",
};

const mockCandidates: CandidateRead[] = [
  {
    profile_id: "profile-1",
    user_id: 42,
    full_name: "Jane Doe",
    match_score: 85,
    rank: 1,
    roles: [{ id: 1, name: "Frontend Engineer", tier: "Core", skill_level: "Advanced" }],
    skill_tags: [{ id: 1, name: "React", is_ai_generated: false }],
  },
];

const mockListMyTeams = vi.fn();
const mockCreateTeam = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockGetTeamCapability = vi.fn();
const mockGetRecommendations = vi.fn();
const mockAddUnregisteredMember = vi.fn();
const mockRemoveTeamMember = vi.fn();
const mockCreateJobPosting = vi.fn();
const mockCloseJobPosting = vi.fn();
const mockSendOffer = vi.fn();
const mockUpdateJobPosting = vi.fn();
const mockUpdateTeamMemberRole = vi.fn();

vi.mock("@/lib/api", () => ({
  listMyTeams: (...args: unknown[]) => mockListMyTeams(...args),
  createTeam: (...args: unknown[]) => mockCreateTeam(...args),
  getCurrentUser: <T = unknown>() => mockGetCurrentUser() as Promise<T>,
  getTeamCapability: (...args: unknown[]) => mockGetTeamCapability(...args),
  getRecommendations: (...args: unknown[]) => mockGetRecommendations(...args),
  addUnregisteredMember: (...args: unknown[]) => mockAddUnregisteredMember(...args),
  removeTeamMember: (...args: unknown[]) => mockRemoveTeamMember(...args),
  createJobPosting: (...args: unknown[]) => mockCreateJobPosting(...args),
  closeJobPosting: (...args: unknown[]) => mockCloseJobPosting(...args),
  sendOffer: (...args: unknown[]) => mockSendOffer(...args),
  updateJobPosting: (...args: unknown[]) => mockUpdateJobPosting(...args),
  updateTeamMemberRole: (...args: unknown[]) => mockUpdateTeamMemberRole(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function setupMocks(options: { teams?: TeamSummary[] | null; error?: string } = {}) {
  const teams = options.teams ?? mockTeams;
  mockListMyTeams.mockResolvedValue(teams);
  mockGetCurrentUser.mockResolvedValue({ id: 1, full_name: "Alice" });
  mockGetTeamCapability.mockResolvedValue(mockCapability);
  mockGetRecommendations.mockResolvedValue(mockCandidates);
  mockCreateTeam.mockResolvedValue({ ...mockTeams[0], id: "team-new" });
  mockAddUnregisteredMember.mockResolvedValue({});
  mockRemoveTeamMember.mockResolvedValue({});
  mockCreateJobPosting.mockResolvedValue({});
  mockCloseJobPosting.mockResolvedValue({});
  mockSendOffer.mockResolvedValue({});
  mockUpdateJobPosting.mockResolvedValue({});
  mockUpdateTeamMemberRole.mockResolvedValue({});
}

describe("Dashboard — FR-35 to FR-40", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  // ─── FR-35: Create Team ───────────────────────────────────────────────

  describe("FR-35: Create Team", () => {
    it("renders New Team button", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /new team/i })).toBeInTheDocument();
      });
    });

    it("opens team creation dialog on click", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /new team/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new team/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Create team")).toBeInTheDocument();
    });

    it("team form has all required fields", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /new team/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new team/i }));

      expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/development goal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/visibility/i)).toBeInTheDocument();
    });

    it("validates team name is required", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /new team/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new team/i }));

      const createButton = screen.getByRole("button", { name: /create team$/i });
      await user.click(createButton);

      expect(screen.getByText("Team name is required.")).toBeInTheDocument();
      expect(mockCreateTeam).not.toHaveBeenCalled();
    });

    it("calls createTeam API with correct payload on submit", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /new team/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new team/i }));

      await user.type(screen.getByLabelText(/team name/i), "Beta Team");
      await user.type(screen.getByLabelText(/development goal/i), "Build an app");
      await user.type(screen.getByLabelText(/description/i), "Mobile app team");

      const createButton = screen.getByRole("button", { name: /create team$/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Beta Team",
            development_goal: "Build an app",
            description: "Mobile app team",
            visibility: "PUBLIC",
          }),
        );
      });
    });
  });

  // ─── FR-37: Add Unregistered Members ──────────────────────────────────

  describe("FR-37: Add Unregistered Members", () => {
    it("renders Manage Members button", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /manage members/i })).toBeInTheDocument();
      });
    });

    it("opens manage members dialog on click", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /manage members/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /manage members/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Add or remove unregistered (external) team members.")).toBeInTheDocument();
    });

    it("dialog has name, role, experience description, and skill level fields", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /manage members/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /manage members/i }));

      expect(screen.getByText("Full name")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Experience description")).toBeInTheDocument();
      expect(screen.getByText("Skill level")).toBeInTheDocument();
    });

    it("calls addUnregisteredMember with experience_description", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /manage members/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /manage members/i }));

      const nameInput = screen.getByText("Full name").closest("div")!.querySelector("input")!;
      const roleInput = screen.getByText("Role").closest("div")!.querySelector("input")!;
      const expTextarea = screen
        .getByText("Experience description")
        .closest("div")!
        .querySelector("textarea")!;

      await user.type(nameInput, "Charlie");
      await user.type(roleInput, "Designer");
      await user.type(expTextarea, "5 years of UI design");

      const addButton = screen.getByRole("button", { name: /add member/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddUnregisteredMember).toHaveBeenCalledWith(
          "team-1",
          expect.objectContaining({
            name: "Charlie",
            role: "Designer",
            experience_description: "5 years of UI design",
          }),
        );
      });
    });

    it("resets form fields after successful submission", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /manage members/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /manage members/i }));

      const nameInput = screen.getByText("Full name").closest("div")!.querySelector("input")!;
      const roleInput = screen.getByText("Role").closest("div")!.querySelector("input")!;
      const expTextarea = screen
        .getByText("Experience description")
        .closest("div")!
        .querySelector("textarea")!;

      await user.type(nameInput, "Charlie");
      await user.type(roleInput, "Designer");
      await user.type(expTextarea, "5 years of UI design");

      await user.click(screen.getByRole("button", { name: /add member/i }));

      await waitFor(() => {
        expect(nameInput).toHaveValue("");
        expect(roleInput).toHaveValue("");
        expect(expTextarea).toHaveValue("");
      });
    });
  });

  // ─── FR-39: Team Visibility ───────────────────────────────────────────

  describe("FR-39: Team Visibility", () => {
    it("displays PUBLIC visibility badge", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        const publicTexts = screen.getAllByText("PUBLIC");
        expect(publicTexts.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("displays PRIVATE visibility badge when private team selected", async () => {
      setupMocks({ teams: [mockTeams[1]] });
      render(<DashboardPage />);

      await waitFor(() => {
        const privateTexts = screen.getAllByText("PRIVATE");
        expect(privateTexts.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("team creation form has visibility field", async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /new team/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /new team/i }));

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(screen.getByLabelText(/visibility/i)).toBeInTheDocument();
    });
  });

  // ─── FR-40: Team Capability ───────────────────────────────────────────

  describe("FR-40: Team Capability", () => {
    it("displays Team Analytics section with overall level", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText("Team Analytics")).toBeInTheDocument();
      });
      await waitFor(() => {
        const advancedEls = screen.getAllByText("Advanced");
        expect(advancedEls.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows progress bar", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        const progressBar = document.querySelector('[style*="width"]');
        expect(progressBar).toBeTruthy();
      });
    });

    it("shows error on 403 response", async () => {
      mockGetTeamCapability.mockRejectedValue({ status: 403 });
      render(<DashboardPage />);
      await waitFor(() => {
        expect(
          screen.getByText("Only team members can view the capability profile."),
        ).toBeInTheDocument();
      });
    });
  });

  // ─── Cross-cutting Dashboard Tests ────────────────────────────────────

  describe("Dashboard Cross-cutting", () => {
    it("renders team name and member count", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        const teamNames = screen.getAllByText("Alpha Squad");
        expect(teamNames.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("2 members")).toBeInTheDocument();
      });
    });

    it("renders development goal and description as separate fields", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText("Development Goal")).toBeInTheDocument();
        expect(screen.getByText("Build a rocket")).toBeInTheDocument();
        expect(screen.getByText("Project Description")).toBeInTheDocument();
        expect(screen.getByText("A team of rocket scientists")).toBeInTheDocument();
      });
    });

    it("renders leader name badge", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/Leader: Alice/)).toBeInTheDocument();
      });
    });

    it("renders posting count badge", async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText("1 postings")).toBeInTheDocument();
      });
    });
  });
});
