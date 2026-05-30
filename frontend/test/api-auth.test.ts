import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	saveAuthTokens,
	clearAuthTokens,
	getStoredAccessToken,
	getStoredRefreshToken,
	fetchProtectedApi,
	getCurrentUser,
	logoutApi,
} from "@/lib/api";

beforeEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("fetchProtectedApi (FR-20)", () => {
	it("attaches Bearer token to requests", async () => {
		saveAuthTokens({
			access_token: "my-token",
			refresh_token: "my-refresh",
		});

		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);

		await fetchProtectedApi("/test");

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining("/test"),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer my-token",
				}),
			}),
		);
	});

	it("returns parsed response on success", async () => {
		saveAuthTokens({
			access_token: "token",
			refresh_token: "refresh",
		});

		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({ data: "hello" }),
				{ status: 200 },
			),
		);

		const result = await fetchProtectedApi<{ data: string }>("/test");
		expect(result).toEqual({ data: "hello" });
	});

	it("retries on 401 after successful token refresh", async () => {
		saveAuthTokens({
			access_token: "expired-token",
			refresh_token: "valid-refresh",
		});

		const fetchSpy = vi
			.spyOn(global, "fetch")
			.mockResolvedValueOnce(
				new Response("Unauthorized", { status: 401 }),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						access_token: "new-access",
						refresh_token: "new-refresh",
					}),
					{ status: 200 },
				),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ success: true }),
					{ status: 200 },
				),
			);

		const result = await fetchProtectedApi<{ success: boolean }>(
			"/protected",
		);

		expect(result).toEqual({ success: true });
		expect(fetchSpy).toHaveBeenCalledTimes(3);
	});

	it("throws 'Session expired' if refresh fails on 401", async () => {
		saveAuthTokens({
			access_token: "expired",
			refresh_token: "bad-refresh",
		});

		vi.spyOn(global, "fetch")
			.mockResolvedValueOnce(
				new Response("Unauthorized", { status: 401 }),
			)
			.mockResolvedValueOnce(
				new Response("Unauthorized", { status: 401 }),
			);

		await expect(fetchProtectedApi("/test")).rejects.toThrow(
			"Session expired",
		);
	});

	it("throws with status code on non-ok response", async () => {
		saveAuthTokens({
			access_token: "token",
			refresh_token: "refresh",
		});

		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response("Not Found", { status: 404 }),
		);

		await expect(fetchProtectedApi("/missing")).rejects.toThrow("404");
	});

	it("throws when no access token is available", async () => {
		await expect(fetchProtectedApi("/test")).rejects.toThrow(
			"Missing access token",
		);
	});
});

describe("getCurrentUser (FR-20)", () => {
	it("calls /auth/me endpoint", async () => {
		saveAuthTokens({
			access_token: "token",
			refresh_token: "refresh",
		});

		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					id: 1,
					full_name: "Test",
					email: "test@example.com",
				}),
				{ status: 200 },
			),
		);

		const user = await getCurrentUser<{
			id: number;
			full_name: string;
		}>();

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining("/auth/me"),
			expect.anything(),
		);
		expect(user.full_name).toBe("Test");
	});
});

describe("logoutApi (FR-20)", () => {
	it("calls POST /auth/logout and clears tokens", async () => {
		saveAuthTokens({
			access_token: "token",
			refresh_token: "refresh",
		});

		const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 200 }),
		);

		await logoutApi();

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.stringContaining("/auth/logout"),
			expect.objectContaining({ method: "POST" }),
		);
		expect(getStoredAccessToken()).toBeNull();
		expect(getStoredRefreshToken()).toBeNull();
	});

	it("clears tokens even if logout API fails", async () => {
		saveAuthTokens({
			access_token: "token",
			refresh_token: "refresh",
		});

		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response("Server Error", { status: 500 }),
		);

		await logoutApi();

		expect(getStoredAccessToken()).toBeNull();
		expect(getStoredRefreshToken()).toBeNull();
	});
});
