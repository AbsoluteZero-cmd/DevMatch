import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordPage from "@/app/(public)/forgot-password/page.tsx";

describe("ForgotPasswordPage (FR-21 — mock UI)", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders email input and submit button", () => {
		render(<ForgotPasswordPage />);

		expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /send reset link/i }),
		).toBeInTheDocument();
	});

	it("shows email validation error on blur when invalid", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ForgotPasswordPage />);

		const emailInput = screen.getByLabelText(/email address/i);
		await user.type(emailInput, "bad-email");
		await user.tab();

		expect(
			screen.getByText("Please enter a valid email address"),
		).toBeInTheDocument();
	});

	it("shows loading state when form is submitted", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ForgotPasswordPage />);

		await user.type(
			screen.getByLabelText(/email address/i),
			"user@example.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send reset link/i }),
		);

		expect(screen.getByText("Sending...")).toBeInTheDocument();
	});

	it("shows success state after mock delay", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ForgotPasswordPage />);

		await user.type(
			screen.getByLabelText(/email address/i),
			"user@example.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send reset link/i }),
		);

		await vi.advanceTimersByTimeAsync(1600);

		await waitFor(() => {
			expect(screen.getByText("Check your email")).toBeInTheDocument();
		});
		expect(screen.getByText("user@example.com")).toBeInTheDocument();
	});

	it("shows error for email containing 'notfound'", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ForgotPasswordPage />);

		await user.type(
			screen.getByLabelText(/email address/i),
			"notfound@test.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send reset link/i }),
		);

		await vi.advanceTimersByTimeAsync(1600);

		await waitFor(() => {
			expect(
				screen.getByText("No account found with this email address"),
			).toBeInTheDocument();
		});
	});

	it("resets form when 'Try another email' is clicked", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ForgotPasswordPage />);

		await user.type(
			screen.getByLabelText(/email address/i),
			"user@example.com",
		);
		await user.click(
			screen.getByRole("button", { name: /send reset link/i }),
		);

		await vi.advanceTimersByTimeAsync(1600);

		await waitFor(() => {
			expect(screen.getByText("Check your email")).toBeInTheDocument();
		});

		await user.click(
			screen.getByRole("button", { name: /try another email/i }),
		);

		expect(
			screen.getByRole("button", { name: /send reset link/i }),
		).toBeInTheDocument();
	});

	it("has a back to login link", () => {
		render(<ForgotPasswordPage />);

		const link = screen.getByRole("link", { name: /back to login/i });
		expect(link).toHaveAttribute("href", "/login");
	});
});
