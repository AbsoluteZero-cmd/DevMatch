import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/(public)/login/page.tsx";

const mockPush = vi.fn();
const mockLogin = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/contexts/auth-context", () => ({
	useAuth: () => ({
		login: mockLogin,
		user: null,
	}),
}));

describe("LoginPage (FR-20, FR-02)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLogin.mockResolvedValue({
			access_token: "test-access",
			refresh_token: "test-refresh",
		});
	});

	it("renders email and password fields", () => {
		render(<LoginPage />);

		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
	});

	it("shows email validation error on blur when invalid", async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		const emailInput = screen.getByLabelText(/email/i);
		await user.type(emailInput, "bad-email");
		await user.tab();

		expect(
			screen.getByText("Please enter a valid email address"),
		).toBeInTheDocument();
	});

	it("submit button is disabled when form is empty", () => {
		render(<LoginPage />);

		const submitButton = screen.getByRole("button", { name: /sign in/i });
		expect(submitButton).toBeDisabled();
	});

	it("submit button enables when fields are valid", async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.type(screen.getByLabelText(/email/i), "user@example.com");
		await user.type(screen.getByLabelText(/password/i), "password123");

		const submitButton = screen.getByRole("button", { name: /sign in/i });
		expect(submitButton).toBeEnabled();
	});

	it("calls login with correct credentials", async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.type(screen.getByLabelText(/email/i), "user@example.com");
		await user.type(screen.getByLabelText(/password/i), "mypassword");
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		await waitFor(() => {
			expect(mockLogin).toHaveBeenCalledWith({
				email: "user@example.com",
				password: "mypassword",
			});
		});
	});

	it("redirects to /dashboard on successful login", async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.type(screen.getByLabelText(/email/i), "user@example.com");
		await user.type(screen.getByLabelText(/password/i), "mypassword");
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/dashboard");
		});
	});

	it("displays error banner on login failure", async () => {
		mockLogin.mockRejectedValue(new Error("Login failed"));
		const user = userEvent.setup();
		render(<LoginPage />);

		await user.type(screen.getByLabelText(/email/i), "user@example.com");
		await user.type(screen.getByLabelText(/password/i), "wrongpassword");
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		await waitFor(() => {
			expect(
				screen.getByText(
					"Login failed. Please check your credentials and try again.",
				),
			).toBeInTheDocument();
		});
	});

	it("has a forgot password link", () => {
		render(<LoginPage />);

		const link = screen.getByRole("link", { name: /forgot password/i });
		expect(link).toHaveAttribute("href", "/forgot-password");
	});

	it("has a register link", () => {
		render(<LoginPage />);

		const link = screen.getByRole("link", { name: /create one/i });
		expect(link).toHaveAttribute("href", "/register");
	});

	it("toggles password visibility", async () => {
		const user = userEvent.setup();
		render(<LoginPage />);

		const passwordInput = screen.getByLabelText(/password/i);
		expect(passwordInput).toHaveAttribute("type", "password");

		const buttons = screen.getAllByRole("button");
		const eyeButton = buttons.find(
			(b) =>
				!b.textContent &&
				!b.getAttribute("type"),
		);
		if (eyeButton) {
			await user.click(eyeButton);
			expect(passwordInput).toHaveAttribute("type", "text");
		}
	});
});
