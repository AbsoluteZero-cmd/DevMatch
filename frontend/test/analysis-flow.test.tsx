import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	triggerAnalysis,
	triggerAnalysisSync,
	getAnalysisStatus,
	saveAuthTokens,
} from "@/lib/api";

beforeEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
	saveAuthTokens({
		access_token: "test-token",
		refresh_token: "test-refresh",
	});
});

afterEach(() => {
	localStorage.clear();
});

// FR-29: AI Role Classification API functions
describe("FR-29: Analysis API functions", () => {
	it("triggerAnalysis sends POST to /profile/analyze", async () => {
		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					message: "Analysis started.",
					profile_id: "abc-123",
				}),
				{ status: 202 },
			),
		);

		const result = await triggerAnalysis();

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining("/profile/analyze"),
			expect.objectContaining({ method: "POST" }),
		);
		expect(result.message).toBe("Analysis started.");
		expect(result.profile_id).toBe("abc-123");
	});

	it("triggerAnalysisSync sends POST to /profile/analyze/sync", async () => {
		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					message: "Analysis complete.",
					profile_id: "abc-123",
				}),
				{ status: 200 },
			),
		);

		const result = await triggerAnalysisSync();

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining("/profile/analyze/sync"),
			expect.objectContaining({ method: "POST" }),
		);
		expect(result.message).toBe("Analysis complete.");
	});

	it("getAnalysisStatus sends GET to /profile/analyze/status", async () => {
		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({ last_ai_analysis: "2026-05-31T00:00:00Z" }),
				{ status: 200 },
			),
		);

		const result = await getAnalysisStatus();

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining("/profile/analyze/status"),
			expect.objectContaining({}),
		);
		expect(result.last_ai_analysis).toBe("2026-05-31T00:00:00Z");
	});

	it("getAnalysisStatus returns null when never analyzed", async () => {
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({ last_ai_analysis: null }),
				{ status: 200 },
			),
		);

		const result = await getAnalysisStatus();

		expect(result.last_ai_analysis).toBeNull();
	});

	it("handles analysis API errors gracefully", async () => {
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({ detail: "LLM service unavailable" }),
				{ status: 503 },
			),
		);

		await expect(triggerAnalysis()).rejects.toThrow();
	});
});
