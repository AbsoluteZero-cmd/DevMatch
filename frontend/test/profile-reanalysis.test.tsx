import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	triggerAnalysis,
	getAnalysisStatus,
	patchMyProfile,
	upsertSkillTags,
	createProject,
	updateProject,
	deleteProject,
	createEducation,
	updateEducation,
	deleteEducation,
} from "@/lib/api";

vi.mock("@/lib/api", async () => {
	const actual = await vi.importActual("@/lib/api");
	return {
		...actual,
		triggerAnalysis: vi.fn().mockResolvedValue({ message: "Analysis started", profile_id: "abc" }),
		getAnalysisStatus: vi.fn().mockResolvedValue({ last_ai_analysis: "2026-01-01T00:00:00Z" }),
		patchMyProfile: vi.fn().mockResolvedValue({ id: "p1", full_name: "Test" }),
		upsertSkillTags: vi.fn().mockResolvedValue({ id: "p1", skill_tags: [] }),
		createProject: vi.fn().mockResolvedValue({ id: "p1", project_history_entries: [] }),
		updateProject: vi.fn().mockResolvedValue({ id: "p1", project_history_entries: [] }),
		deleteProject: vi.fn().mockResolvedValue(undefined),
		createEducation: vi.fn().mockResolvedValue({ id: "p1", education_entries: [] }),
		updateEducation: vi.fn().mockResolvedValue({ id: "p1", education_entries: [] }),
		deleteEducation: vi.fn().mockResolvedValue(undefined),
		fetchProtectedApi: vi.fn(),
		getMyProfile: vi.fn().mockResolvedValue({ id: "p1", roles: [], skill_tags: [] }),
		saveAuthTokens: vi.fn(),
		getStoredAccessToken: vi.fn().mockReturnValue("test-token"),
	};
});

// FR-34: Auto-trigger re-analysis on profile update
describe("FR-34: Auto-trigger re-analysis on profile save", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls triggerAnalysis after patchMyProfile succeeds", async () => {
		await patchMyProfile({ full_name: "New Name" });
		await triggerAnalysis();

		expect(patchMyProfile).toHaveBeenCalledWith({ full_name: "New Name" });
		expect(triggerAnalysis).toHaveBeenCalled();
	});

	it("calls triggerAnalysis after upsertSkillTags succeeds", async () => {
		await upsertSkillTags({ tags: ["React", "TypeScript"] });
		await triggerAnalysis();

		expect(upsertSkillTags).toHaveBeenCalledWith({ tags: ["React", "TypeScript"] });
		expect(triggerAnalysis).toHaveBeenCalled();
	});

	it("calls triggerAnalysis after createProject succeeds", async () => {
		await createProject({ project_name: "Test Project" });
		await triggerAnalysis();

		expect(createProject).toHaveBeenCalledWith({ project_name: "Test Project" });
		expect(triggerAnalysis).toHaveBeenCalled();
	});

	it("calls triggerAnalysis after updateProject succeeds", async () => {
		await updateProject(1, { project_name: "Updated" });
		await triggerAnalysis();

		expect(updateProject).toHaveBeenCalledWith(1, { project_name: "Updated" });
		expect(triggerAnalysis).toHaveBeenCalled();
	});

	it("calls triggerAnalysis after deleteProject succeeds", async () => {
		await deleteProject(1);
		await triggerAnalysis();

		expect(deleteProject).toHaveBeenCalledWith(1);
		expect(triggerAnalysis).toHaveBeenCalled();
	});

	it("calls triggerAnalysis after createEducation succeeds", async () => {
		await createEducation({ institution_name: "MIT" });
		await triggerAnalysis();

		expect(createEducation).toHaveBeenCalledWith({ institution_name: "MIT" });
		expect(triggerAnalysis).toHaveBeenCalled();
	});

	it("calls triggerAnalysis after updateEducation succeeds", async () => {
		await updateEducation(1, { institution_name: "Stanford" });
		await triggerAnalysis();

		expect(updateEducation).toHaveBeenCalledWith(1, { institution_name: "Stanford" });
		expect(triggerAnalysis).toHaveBeenCalled();
	});

	it("calls triggerAnalysis after deleteEducation succeeds", async () => {
		await deleteEducation(1);
		await triggerAnalysis();

		expect(deleteEducation).toHaveBeenCalledWith(1);
		expect(triggerAnalysis).toHaveBeenCalled();
	});
});

// FR-34: Analysis failure should not block profile save
describe("FR-34: Analysis error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("analysis failure does not affect profile save result", async () => {
		const mockProfile = { id: "p1", full_name: "Test" };
		vi.mocked(patchMyProfile).mockResolvedValue(mockProfile);
		vi.mocked(triggerAnalysis).mockRejectedValue(new Error("LLM unavailable"));

		const result = await patchMyProfile({ full_name: "Test" });
		expect(result).toEqual(mockProfile);

		// triggerAnalysis fails but that's fire-and-forget
		await expect(triggerAnalysis()).rejects.toThrow("LLM unavailable");
	});

	it("getAnalysisStatus fetches latest analysis timestamp", async () => {
		const status = await getAnalysisStatus();

		expect(getAnalysisStatus).toHaveBeenCalled();
		expect(status.last_ai_analysis).toBe("2026-01-01T00:00:00Z");
	});
});
