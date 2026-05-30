import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "@/app/(public)/register/page.tsx";

const mockPush = vi.fn();
const mockRegister = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/contexts/auth-context", () => ({
	useAuth: () => ({
		register: mockRegister,
		user: null,
	}),
}));

describe("RegisterPage (FR-18, FR-01, FR-02)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRegister.mockResolvedValue({});
	});

	it("renders all required fields", () => {
		render(<RegisterPage />);

		expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
	});

	it("renders account type toggles", () => {
		render(<RegisterPage />);

		expect(screen.getByText("Developer")).toBeInTheDocument();
		expect(screen.getByText("Team Leader")).toBeInTheDocument();
	});

	it("shows name validation error on blur when empty", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const nameInput = screen.getByLabelText(/full name/i);
		await user.click(nameInput);
		await user.tab();

		expect(screen.getByText("Please enter your name")).toBeInTheDocument();
	});

	it("shows email validation error on blur when invalid", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const emailInput = screen.getByLabelText(/email/i);
		await user.type(emailInput, "invalid");
		await user.tab();

		expect(
			screen.getByText("Please enter a valid email address"),
		).toBeInTheDocument();
	});

	it("shows password helper text indicating requirement", () => {
		render(<RegisterPage />);

		expect(
			screen.getByText("Password must be at least 8 characters"),
		).toBeInTheDocument();
	});

	it("password helper turns green when valid", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const passwordInput = screen.getByLabelText(/password/i);
		await user.type(passwordInput, "12345678");

		const helperText = screen.getByText(
			"Password must be at least 8 characters",
		);
		expect(helperText.className).toContain("text-green-600");
	});

	it("submit button is disabled when form is invalid", () => {
		render(<RegisterPage />);

		const submitButton = screen.getByRole("button", {
			name: /create account/i,
		});
		expect(submitButton).toBeDisabled();
	});

	it("submit button enables when all fields are valid", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		await user.type(screen.getByLabelText(/full name/i), "John Doe");
		await user.type(screen.getByLabelText(/email/i), "john@example.com");
		await user.type(screen.getByLabelText(/password/i), "password123");

		const submitButton = screen.getByRole("button", {
			name: /create account/i,
		});
		expect(submitButton).toBeEnabled();
	});

	it("calls register with correct payload on submit", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		await user.type(screen.getByLabelText(/full name/i), "John Doe");
		await user.type(screen.getByLabelText(/email/i), "john@example.com");
		await user.type(screen.getByLabelText(/password/i), "password123");
		await user.click(
			screen.getByRole("button", { name: /create account/i }),
		);

		await waitFor(() => {
			expect(mockRegister).toHaveBeenCalledWith({
				full_name: "John Doe",
				email: "john@example.com",
				password: "password123",
				role: "developer",
			});
		});
	});

	it("redirects to /login after successful registration", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		await user.type(screen.getByLabelText(/full name/i), "John Doe");
		await user.type(screen.getByLabelText(/email/i), "john@example.com");
		await user.type(screen.getByLabelText(/password/i), "password123");
		await user.click(
			screen.getByRole("button", { name: /create account/i }),
		);

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/login");
		});
	});

	it("sends team-leader role when Team Leader is selected", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		await user.click(screen.getByText("Team Leader"));
		await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
		await user.type(screen.getByLabelText(/email/i), "jane@example.com");
		await user.type(screen.getByLabelText(/password/i), "password123");
		await user.click(
			screen.getByRole("button", { name: /create account/i }),
		);

		await waitFor(() => {
			expect(mockRegister).toHaveBeenCalledWith(
				expect.objectContaining({ role: "team-leader" }),
			);
		});
	});

	it("has a link to the login page", () => {
		render(<RegisterPage />);

		const link = screen.getByRole("link", { name: /sign in/i });
		expect(link).toHaveAttribute("href", "/login");
	});

	it("toggles password visibility", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const passwordInput = screen.getByLabelText(/password/i);
		expect(passwordInput).toHaveAttribute("type", "password");

		const toggleButton = screen.getByRole("button", { name: "" });
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute("type", "text");

		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute("type", "password");
	});
});
