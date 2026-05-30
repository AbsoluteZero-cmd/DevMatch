import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EducationSection } from "@/components/education-section";
import type { EducationRead } from "@/lib/profile-types";

function makeEducation(overrides: Partial<EducationRead> = {}): EducationRead {
	return {
		id: 1,
		institution_name: "MIT",
		degree: "Bachelor's Degree",
		major: "Computer Science",
		graduation_year: 2024,
		is_hidden: false,
		...overrides,
	};
}

describe("EducationSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders education entries with institution, degree, major", () => {
		render(
			<EducationSection educationEntries={[makeEducation()]} />,
		);

		expect(screen.getByText("MIT")).toBeInTheDocument();
		expect(screen.getAllByText("Bachelor's Degree").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Major: Computer Science")).toBeInTheDocument();
		expect(screen.getByText("2024")).toBeInTheDocument();
	});

	it("shows empty state when no entries", () => {
		render(<EducationSection educationEntries={[]} />);

		expect(
			screen.getByText("No education history has been added yet."),
		).toBeInTheDocument();
	});

	it("shows edit/delete buttons in edit mode", () => {
		render(
			<EducationSection
				educationEntries={[makeEducation()]}
				editMode
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(screen.getByText("Edit")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("shows visibility toggle in edit mode", () => {
		render(
			<EducationSection
				educationEntries={[makeEducation()]}
				editMode
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
				onToggleVisibility={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("Hide education")).toBeInTheDocument();
	});

	it("calls onToggleVisibility when eye icon clicked", async () => {
		const user = userEvent.setup();
		const onToggleVisibility = vi.fn();

		render(
			<EducationSection
				educationEntries={[makeEducation()]}
				editMode
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
				onToggleVisibility={onToggleVisibility}
			/>,
		);

		await user.click(screen.getByLabelText("Hide education"));

		expect(onToggleVisibility).toHaveBeenCalledWith(1, true);
	});

	it("shows create form when Add education clicked", async () => {
		const user = userEvent.setup();

		render(
			<EducationSection
				educationEntries={[]}
				editMode
				onCreate={vi.fn()}
			/>,
		);

		await user.click(screen.getByText("Add education"));

		expect(screen.getByText("Save education")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Institution name")).toBeInTheDocument();
	});

	it("calls onCreate with payload when form submitted", async () => {
		const user = userEvent.setup();
		const onCreate = vi.fn();

		render(
			<EducationSection
				educationEntries={[]}
				editMode
				onCreate={onCreate}
			/>,
		);

		await user.click(screen.getByText("Add education"));
		await user.type(
			screen.getByPlaceholderText("Institution name"),
			"Stanford",
		);
		await user.click(screen.getByText("Save education"));

		expect(onCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				institution_name: "Stanford",
			}),
		);
	});

	it("applies opacity style to hidden entries", () => {
		render(
			<EducationSection
				educationEntries={[makeEducation({ is_hidden: true })]}
				editMode
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
				onToggleVisibility={vi.fn()}
			/>,
		);

		const card = screen.getByText("MIT").closest("[class*='opacity']");
		expect(card).toBeTruthy();
	});
});
