import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectsSection } from "@/components/projects-section";

function makeProject(overrides = {}) {
	return {
		id: 1,
		name: "DevMatch",
		description: "A developer matching platform",
		duration: "6 months",
		role: "Full-Stack Engineer",
		technologies: ["React", "TypeScript", "FastAPI"],
		is_hidden: false,
		...overrides,
	};
}

describe("ProjectsSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders project cards with name, description, role, duration", () => {
		render(<ProjectsSection projects={[makeProject()]} />);

		expect(screen.getByText("DevMatch")).toBeInTheDocument();
		expect(
			screen.getByText("A developer matching platform"),
		).toBeInTheDocument();
		expect(screen.getByText("Role: Full-Stack Engineer")).toBeInTheDocument();
		expect(screen.getByText("Duration: 6 months")).toBeInTheDocument();
	});

	it("shows empty state when no projects", () => {
		render(<ProjectsSection projects={[]} />);

		expect(
			screen.getByText("No projects have been added yet."),
		).toBeInTheDocument();
	});

	it("shows edit/delete buttons in edit mode", () => {
		render(
			<ProjectsSection
				projects={[makeProject()]}
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
			<ProjectsSection
				projects={[makeProject()]}
				editMode
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
				onToggleVisibility={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("Hide project")).toBeInTheDocument();
	});

	it("calls onToggleVisibility when eye icon clicked", async () => {
		const user = userEvent.setup();
		const onToggleVisibility = vi.fn();

		render(
			<ProjectsSection
				projects={[makeProject()]}
				editMode
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
				onToggleVisibility={onToggleVisibility}
			/>,
		);

		await user.click(screen.getByLabelText("Hide project"));

		expect(onToggleVisibility).toHaveBeenCalledWith(1, true);
	});

	it("shows create form when Add project clicked", async () => {
		const user = userEvent.setup();

		render(
			<ProjectsSection
				projects={[]}
				editMode
				onCreate={vi.fn()}
			/>,
		);

		await user.click(screen.getByText("Add project"));

		expect(screen.getByPlaceholderText("Project name")).toBeInTheDocument();
		expect(screen.getByText("Create")).toBeInTheDocument();
	});

	it("displays technologies as individual tags", () => {
		render(<ProjectsSection projects={[makeProject()]} />);

		expect(screen.getByText("React")).toBeInTheDocument();
		expect(screen.getByText("TypeScript")).toBeInTheDocument();
		expect(screen.getByText("FastAPI")).toBeInTheDocument();
	});

	it("applies opacity style to hidden projects", () => {
		render(
			<ProjectsSection
				projects={[makeProject({ is_hidden: true })]}
				editMode
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
				onToggleVisibility={vi.fn()}
			/>,
		);

		const card = screen.getByText("DevMatch").closest("[class*='opacity']");
		expect(card).toBeTruthy();
	});
});
