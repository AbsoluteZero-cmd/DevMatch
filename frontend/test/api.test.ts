import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	getStoredAuthTokens,
	saveAuthTokens,
	clearAuthTokens,
	getStoredAccessToken,
	getStoredRefreshToken,
	refreshAuthTokens,
	triggerAnalysis,
	getAnalysisStatus,
	getOAuthAuthorizationUrl,
	getOAuthProviderStatus,
} from "@/lib/api";

const ACCESS_TOKEN_KEY = "devmatch_access_token";
const REFRESH_TOKEN_KEY = "devmatch_refresh_token";

beforeEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

afterEach(() => {
	localStorage.clear();
});

describe("Token storage", () => {
	it("returns null when no tokens stored", () => {
		expect(getStoredAuthTokens()).toBeNull();
	});

	it("saves and retrieves tokens", () => {
		const tokens = {
			access_token: "access-123",
			refresh_token: "refresh-456",
		};
		saveAuthTokens(tokens);

		expect(getStoredAuthTokens()).toEqual(tokens);
		expect(getStoredAccessToken()).toBe("access-123");
		expect(getStoredRefreshToken()).toBe("refresh-456");
	});

	it("clears tokens", () => {
		saveAuthTokens({
			access_token: "access-123",
			refresh_token: "refresh-456",
		});
		clearAuthTokens();

		expect(getStoredAuthTokens()).toBeNull();
		expect(getStoredAccessToken()).toBeNull();
		expect(getStoredRefreshToken()).toBeNull();
	});

	it("returns null when only access token exists", () => {
		localStorage.setItem(ACCESS_TOKEN_KEY, "access-123");
		expect(getStoredAuthTokens()).toBeNull();
	});

	it("returns null when only refresh token exists", () => {
		localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-456");
		expect(getStoredAuthTokens()).toBeNull();
	});
});

describe("refreshAuthTokens", () => {
	it("throws when no refresh token is available", async () => {
		await expect(refreshAuthTokens()).rejects.toThrow(
			"No refresh token available",
		);
	});

	it("calls /auth/refresh endpoint with refresh token", async () => {
		saveAuthTokens({
			access_token: "old-access",
			refresh_token: "old-refresh",
		});

		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					access_token: "new-access",
					refresh_token: "new-refresh",
				}),
				{ status: 200 },
			),
		);

		const tokens = await refreshAuthTokens();

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining("/auth/refresh"),
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ refresh_token: "old-refresh" }),
			}),
		);
		expect(tokens.access_token).toBe("new-access");
		expect(tokens.refresh_token).toBe("new-refresh");
		expect(getStoredAccessToken()).toBe("new-access");
	});

	it("clears tokens on refresh failure", async () => {
		saveAuthTokens({
			access_token: "old-access",
			refresh_token: "old-refresh",
		});

		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response("Unauthorized", { status: 401 }),
		);

		await expect(refreshAuthTokens()).rejects.toThrow(
			"Token refresh failed",
		);
		expect(getStoredAuthTokens()).toBeNull();
	});
});

describe("API functions", () => {
	beforeEach(() => {
		saveAuthTokens({
			access_token: "test-token",
			refresh_token: "test-refresh",
		});
	});

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

	it("getAnalysisStatus sends GET to /profile/analyze/status", async () => {
		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({ last_ai_analysis: "2026-01-01T00:00:00Z" }),
				{ status: 200 },
			),
		);

		const result = await getAnalysisStatus();

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining("/profile/analyze/status"),
			expect.objectContaining({}),
		);
		expect(result.last_ai_analysis).toBe("2026-01-01T00:00:00Z");
	});

	it("getOAuthAuthorizationUrl sends GET to /oauth/{provider}/authorize", async () => {
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					provider: "github",
					authorization_url: "https://github.com/login/oauth/authorize",
					state: "abc",
				}),
				{ status: 200 },
			),
		);

		const result = await getOAuthAuthorizationUrl("github");

		expect(result).toEqual(
			expect.objectContaining({
				provider: "github",
				authorization_url: expect.stringContaining("github.com"),
			}),
		);
	});

	it("getOAuthProviderStatus sends GET to /oauth/{provider}/status", async () => {
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({ provider: "github", configured: true }),
				{ status: 200 },
			),
		);

		const result = await getOAuthProviderStatus("github");

		expect(result).toEqual({ provider: "github", configured: true });
	});
});
