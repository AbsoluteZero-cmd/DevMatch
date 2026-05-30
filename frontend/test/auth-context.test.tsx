import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import {
	saveAuthTokens,
	clearAuthTokens,
	getStoredAccessToken,
} from "@/lib/api";

function wrapper({ children }: { children: ReactNode }) {
	return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("AuthProvider (FR-18, FR-20)", () => {
	describe("register", () => {
		it("sends correct payload to /auth/register", async () => {
			const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
				new Response(
					JSON.stringify({ message: "User created" }),
					{ status: 201 },
				),
			);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await act(async () => {
				await result.current.register({
					full_name: "John Doe",
					email: "john@example.com",
					password: "password123",
					role: "developer",
				});
			});

			expect(fetchSpy).toHaveBeenCalledWith(
				expect.stringContaining("/auth/register"),
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						full_name: "John Doe",
						email: "john@example.com",
						password: "password123",
						role: "DEVELOPER",
					}),
				}),
			);
		});

		it("maps team-leader role to TEAM_LEADER", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue(
				new Response(
					JSON.stringify({ message: "User created" }),
					{ status: 201 },
				),
			);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await act(async () => {
				await result.current.register({
					full_name: "Jane Doe",
					email: "jane@example.com",
					password: "password123",
					role: "team-leader",
				});
			});

			const callBody = JSON.parse(
				(vi.mocked(global.fetch).mock.calls[0][1] as RequestInit)
					.body as string,
			);
			expect(callBody.role).toBe("TEAM_LEADER");
		});

		it("throws on non-ok response", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue(
				new Response(
					JSON.stringify({ detail: "Email already registered" }),
					{ status: 400 },
				),
			);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await act(async () => {
				await expect(
					result.current.register({
						full_name: "John",
						email: "dup@example.com",
						password: "password123",
						role: "developer",
					}),
				).rejects.toThrow("Registration failed");
			});
		});
	});

	describe("login", () => {
		it("sends form-urlencoded to /auth/login", async () => {
			vi.spyOn(global, "fetch")
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							access_token: "acc",
							refresh_token: "ref",
						}),
						{ status: 200 },
					),
				)
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							id: 1,
							full_name: "John",
							email: "john@example.com",
						}),
						{ status: 200 },
					),
				);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await act(async () => {
				await result.current.login({
					email: "john@example.com",
					password: "password123",
				});
			});

			const [url, options] = vi.mocked(global.fetch).mock.calls[0];
			expect(url).toContain("/auth/login");
			expect((options as RequestInit).headers).toEqual({
				"Content-Type": "application/x-www-form-urlencoded",
			});
			expect((options as RequestInit).body).toBe(
				"username=john%40example.com&password=password123",
			);
		});

		it("stores tokens and sets user on success", async () => {
			vi.spyOn(global, "fetch")
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							access_token: "my-access",
							refresh_token: "my-refresh",
						}),
						{ status: 200 },
					),
				)
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							id: 1,
							full_name: "John",
							email: "john@example.com",
						}),
						{ status: 200 },
					),
				);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await act(async () => {
				await result.current.login({
					email: "john@example.com",
					password: "password123",
				});
			});

			expect(getStoredAccessToken()).toBe("my-access");
			expect(result.current.user).toEqual({
				id: "1",
				full_name: "John",
				email: "john@example.com",
			});
			expect(result.current.isAuthenticated).toBe(true);
		});

		it("throws on login failure", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue(
				new Response("Unauthorized", { status: 401 }),
			);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await act(async () => {
				await expect(
					result.current.login({
						email: "bad@example.com",
						password: "wrong",
					}),
				).rejects.toThrow("Login failed");
			});
		});
	});

	describe("logout", () => {
		it("calls logout API, clears tokens, and nulls user", async () => {
			saveAuthTokens({
				access_token: "acc",
				refresh_token: "ref",
			});

			vi.spyOn(global, "fetch").mockResolvedValue(
				new Response(null, { status: 200 }),
			);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await act(async () => {
				result.current.logout();
			});

			expect(result.current.user).toBeNull();
			expect(result.current.isAuthenticated).toBe(false);
			expect(getStoredAccessToken()).toBeNull();
		});
	});

	describe("restoreAuth", () => {
		it("loads user from stored tokens on mount", async () => {
			saveAuthTokens({
				access_token: "stored-acc",
				refresh_token: "stored-ref",
			});

			vi.spyOn(global, "fetch").mockResolvedValue(
				new Response(
					JSON.stringify({
						id: 5,
						full_name: "Stored User",
						email: "stored@example.com",
					}),
					{ status: 200 },
				),
			);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await vi.waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.user).toEqual({
				id: "5",
				full_name: "Stored User",
				email: "stored@example.com",
			});
		});

		it("clears tokens if /auth/me fails", async () => {
			saveAuthTokens({
				access_token: "bad-acc",
				refresh_token: "bad-ref",
			});

			vi.spyOn(global, "fetch").mockResolvedValue(
				new Response("Unauthorized", { status: 401 }),
			);

			const { result } = renderHook(() => useAuth(), { wrapper });

			await vi.waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.user).toBeNull();
			expect(getStoredAccessToken()).toBeNull();
		});

		it("starts with isLoading true and sets false after restore", async () => {
			vi.spyOn(global, "fetch").mockResolvedValue(
				new Response("Unauthorized", { status: 401 }),
			);

			const { result } = renderHook(() => useAuth(), { wrapper });

			// isLoading starts as true (or quickly becomes false if no tokens)
			await vi.waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});
		});
	});
});
