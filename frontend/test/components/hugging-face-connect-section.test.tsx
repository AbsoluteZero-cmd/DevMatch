import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HuggingFaceConnectSection } from "@/components/hugging-face-connect-section";
import type { ExternalURLRead } from "@/lib/profile-types";

vi.mock("@/lib/api", () => ({
	getOAuthProviderStatus: vi.fn().mockResolvedValue({ configured: true }),
}));

function makeLink(overrides: Partial<ExternalURLRead> = {}): ExternalURLRead {
	return {
		id: 2,
		url_type: "HUGGING_FACE",
		url_str: "https://huggingface.co/gpt2",
		source: "MANUAL",
		parse_status: "SUCCESS",
		parse_message: null,
		parsed_at: "2026-01-01T00:00:00Z",
		parsed_repo_list: null,
		parsed_commit_count: null,
		parsed_hf_model_count: 5,
		parsed_hf_dataset_count: 3,
		...overrides,
	};
}

describe("HuggingFaceConnectSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders connect button when no link exists", () => {
		render(
			<HuggingFaceConnectSection
				link={null}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("Connect on Hugging Face")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /connect hugging face/i }),
		).toBeInTheDocument();
	});

	it("renders HuggingFace username link when link exists", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink()}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText(/@gpt2/)).toBeInTheDocument();
	});

	it("displays model count when parse is successful", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink()}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("Published Models")).toBeInTheDocument();
	});

	it("displays dataset count when parse is successful", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink()}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("Published Datasets")).toBeInTheDocument();
	});

	it("shows syncing state when parse is pending", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink({ parse_status: "PENDING" })}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("Syncing Hugging Face data..."),
		).toBeInTheDocument();
		expect(screen.getByText("Syncing...")).toBeInTheDocument();
	});

	it("shows error state when parse failed", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink({
					parse_status: "FAILED",
					parse_message: "API unavailable",
				})}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("API unavailable")).toBeInTheDocument();
		expect(screen.getByText("Failed")).toBeInTheDocument();
	});

	it("shows default error message when parse failed without message", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink({ parse_status: "FAILED", parse_message: null })}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("Failed to sync Hugging Face data."),
		).toBeInTheDocument();
	});

	it("shows edit mode controls when editMode is true", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink()}
				editMode
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(screen.getByText("OAuth")).toBeInTheDocument();
		expect(screen.getByText("Raw URL")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("https://huggingface.co/username"),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save url/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
	});

	it("calls onConnectOAuth when connect button is clicked", async () => {
		const user = userEvent.setup();
		const onConnectOAuth = vi.fn();

		render(
			<HuggingFaceConnectSection
				link={null}
				onConnectOAuth={onConnectOAuth}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /connect hugging face/i }),
		);
		expect(onConnectOAuth).toHaveBeenCalledTimes(1);
	});

	it("calls onSaveManual with URL when save is clicked", async () => {
		const user = userEvent.setup();
		const onSaveManual = vi.fn();

		render(
			<HuggingFaceConnectSection
				link={null}
				editMode
				onConnectOAuth={vi.fn()}
				onSaveManual={onSaveManual}
				onDisconnect={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText(
			"https://huggingface.co/username",
		);
		await user.type(input, "https://huggingface.co/myuser");
		await user.click(screen.getByRole("button", { name: /save url/i }));

		expect(onSaveManual).toHaveBeenCalledWith(
			"https://huggingface.co/myuser",
		);
	});

	it("shows validation error when saving empty URL", async () => {
		const user = userEvent.setup();

		render(
			<HuggingFaceConnectSection
				link={null}
				editMode
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /save url/i }));
		expect(
			screen.getByText("Enter a Hugging Face URL."),
		).toBeInTheDocument();
	});

	it("does not show data panel when link has no parse_status", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink({ parse_status: undefined as unknown as "SUCCESS" })}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		expect(
			screen.queryByText("Hugging Face Data"),
		).not.toBeInTheDocument();
	});

	it("displays zero counts correctly", () => {
		render(
			<HuggingFaceConnectSection
				link={makeLink({
					parsed_hf_model_count: 0,
					parsed_hf_dataset_count: 0,
				})}
				onConnectOAuth={vi.fn()}
				onSaveManual={vi.fn()}
				onDisconnect={vi.fn()}
			/>,
		);

		const zeros = screen.getAllByText("0");
		expect(zeros.length).toBeGreaterThanOrEqual(2);
	});
});
