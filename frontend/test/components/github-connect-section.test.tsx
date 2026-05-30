import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GitHubConnectSection } from "@/components/github-connect-section";
import type { ExternalURLRead } from "@/lib/profile-types";

vi.mock("@/lib/api", () => ({
	getOAuthProviderStatus: vi.fn().mockResolvedValue({ configured: true }),
}));

function makeLink(overrides: Partial<ExternalURLRead> = {}): ExternalURLRead {
	return {
		id: 1,
		url_type: "GITHUB",
		url_str: "https://github.com/octocat",
		source: "MANUAL",
		parse_status: "SUCCESS",
		parse_message: null,
		parsed_at: "2026-01-01T00:00:00Z",
		parsed_repo_list: [
			{
				name: "hello-world",
				html_url: "https://github.com/octocat/hello-world",
				description: "My first repo",
				stargazers_count: 10,
				forks_count: 5,
				top_language: "Python",
			},
		],
		parsed_commit_count: 42,
		parsed_hf_model_count: null,
		parsed_hf_dataset_count: null,
		...overrides,
	};
}

describe("GitHubConnectSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders connect button when no link exists", () => {
		render(
			<GitHubConnectSection
				link={null}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("Connect on GitHub")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /connect github/i }),
		).toBeInTheDocument();
	});

	it("renders GitHub username link when link exists", () => {
		render(
			<GitHubConnectSection
				link={makeLink()}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText(/@octocat/)).toBeInTheDocument();
	});

	it("displays commit count when parse is successful", () => {
		render(
			<GitHubConnectSection
				link={makeLink()}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.getByText("Commits (12 months)")).toBeInTheDocument();
	});

	it("displays repository count when parse is successful", () => {
		render(
			<GitHubConnectSection
				link={makeLink()}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("Public Repositories")).toBeInTheDocument();
	});

	it("displays repository details", () => {
		render(
			<GitHubConnectSection
				link={makeLink()}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("hello-world")).toBeInTheDocument();
		expect(screen.getByText("My first repo")).toBeInTheDocument();
		expect(screen.getByText("Python")).toBeInTheDocument();
	});

	it("shows syncing state when parse is pending", () => {
		render(
			<GitHubConnectSection
				link={makeLink({ parse_status: "PENDING" })}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("Syncing GitHub data...")).toBeInTheDocument();
		expect(screen.getByText("Syncing...")).toBeInTheDocument();
	});

	it("shows error state when parse failed", () => {
		render(
			<GitHubConnectSection
				link={makeLink({
					parse_status: "FAILED",
					parse_message: "Rate limit exceeded",
				})}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
		expect(screen.getByText("Failed")).toBeInTheDocument();
	});

	it("shows default error message when parse failed without message", () => {
		render(
			<GitHubConnectSection
				link={makeLink({ parse_status: "FAILED", parse_message: null })}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("Failed to sync GitHub data."),
		).toBeInTheDocument();
	});

	it("shows edit mode controls when editMode is true", () => {
		render(
			<GitHubConnectSection
				link={makeLink()}
				editMode
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("OAuth")).toBeInTheDocument();
		expect(screen.getByText("Raw URL")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("https://github.com/username")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save url/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
	});

	it("calls onConnectOAuth when connect button is clicked", async () => {
		const user = userEvent.setup();
		const onConnectOAuth = vi.fn();

		render(
			<GitHubConnectSection
				link={null}
				onConnectOAuth={onConnectOAuth}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /connect github/i }),
		);
		expect(onConnectOAuth).toHaveBeenCalledTimes(1);
	});

	it("calls onSaveManual with URL when save is clicked", async () => {
		const user = userEvent.setup();
		const onSaveManual = vi.fn();

		render(
			<GitHubConnectSection
				link={null}
				editMode
				onConnectOAuth={vi.fn()}
				onSaveManual={onSaveManual}
				onDisconnect={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText("https://github.com/username");
		await user.type(input, "https://github.com/testuser");
		await user.click(screen.getByRole("button", { name: /save url/i }));

		expect(onSaveManual).toHaveBeenCalledWith("https://github.com/testuser");
	});

	it("shows validation error when saving empty URL", async () => {
		const user = userEvent.setup();

		render(
			<GitHubConnectSection
				link={null}
				editMode
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /save url/i }));
		expect(screen.getByText("Enter a GitHub URL.")).toBeInTheDocument();
	});

	it("does not show data panel when link has no parse_status", () => {
		render(
			<GitHubConnectSection
				link={makeLink({ parse_status: undefined as unknown as "SUCCESS" })}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.queryByText("GitHub Data")).not.toBeInTheDocument();
	});
});
