import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "@/app/(public)/verify-email/page.tsx";

const { tokenRef, setToken } = vi.hoisted(() => {
	const ref = { current: "abc123" as string | null };
	return {
		tokenRef: ref,
		setToken: (t: string | null) => {
			ref.current = t;
		},
	};
});

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: (key: string) => (key === "token" ? tokenRef.current : null),
	}),
	useRouter: () => ({ push: vi.fn() }),
}));

describe("VerifyEmailPage (FR-19 — mock UI)", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows loading state initially", () => {
		setToken("abc123");
		render(<VerifyEmailPage />);

		expect(
			screen.getByText("Verifying your email"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Please wait while we verify your email address...",
			),
		).toBeInTheDocument();
	});

	it("shows success state with valid token", async () => {
		setToken("valid-token");
		render(<VerifyEmailPage />);

		await vi.advanceTimersByTimeAsync(2100);

		await waitFor(() => {
			expect(screen.getByText("Email verified!")).toBeInTheDocument();
		});

		expect(
			screen.getByText(
				"Your email has been successfully verified. You can now sign in to your account.",
			),
		).toBeInTheDocument();

		const signInLink = screen.getByRole("link", {
			name: /continue to sign in/i,
		});
		expect(signInLink).toHaveAttribute("href", "/login");
	});

	it("shows error state when no token is provided", async () => {
		setToken(null);
		render(<VerifyEmailPage />);

		await vi.advanceTimersByTimeAsync(2100);

		await waitFor(() => {
			expect(
				screen.getByText("Verification failed"),
			).toBeInTheDocument();
		});

		expect(
			screen.getByText(
				"The verification link is invalid or has already been used.",
			),
		).toBeInTheDocument();
	});

	it("shows expired state when token is 'expired'", async () => {
		setToken("expired");
		render(<VerifyEmailPage />);

		await vi.advanceTimersByTimeAsync(2100);

		await waitFor(() => {
			expect(screen.getByText("Link expired")).toBeInTheDocument();
		});

		expect(
			screen.getByText(
				"This verification link has expired. Please request a new one.",
			),
		).toBeInTheDocument();
	});

	it("error state has register and login links", async () => {
		setToken(null);
		render(<VerifyEmailPage />);

		await vi.advanceTimersByTimeAsync(2100);

		await waitFor(() => {
			expect(
				screen.getByText("Verification failed"),
			).toBeInTheDocument();
		});

		const registerLink = screen.getByRole("link", {
			name: /register again/i,
		});
		expect(registerLink).toHaveAttribute("href", "/register");

		const loginLink = screen.getByRole("link", {
			name: /back to sign in/i,
		});
		expect(loginLink).toHaveAttribute("href", "/login");
	});

	it("expired state has resend and login links", async () => {
		setToken("expired");
		render(<VerifyEmailPage />);

		await vi.advanceTimersByTimeAsync(2100);

		await waitFor(() => {
			expect(screen.getByText("Link expired")).toBeInTheDocument();
		});

		expect(
			screen.getByRole("button", { name: /resend verification email/i }),
		).toBeInTheDocument();

		const loginLink = screen.getByRole("link", {
			name: /back to sign in/i,
		});
		expect(loginLink).toHaveAttribute("href", "/login");
	});
});
