import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillsSection } from "@/components/skills-section";
import type { SkillTagRead } from "@/lib/profile-types";

vi.mock("@/lib/api", () => ({
	getAllSkillTags: vi.fn().mockResolvedValue([
		{ id: 1, name: "React", is_ai_generated: false },
		{ id: 2, name: "TypeScript", is_ai_generated: false },
		{ id: 3, name: "Python", is_ai_generated: true },
	]),
}));

function makeSkills(overrides: Partial<SkillTagRead>[] = []): SkillTagRead[] {
	const defaults: SkillTagRead[] = [
		{ id: 1, name: "React", is_ai_generated: false },
		{ id: 2, name: "TypeScript", is_ai_generated: false },
	];
	return overrides.length > 0
		? overrides.map((o, i) => ({ ...defaults[i], ...o }))
		: defaults;
}

describe("SkillsSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders skill tags from props", () => {
		render(<SkillsSection skills={makeSkills()} />);

		expect(screen.getByText("React")).toBeInTheDocument();
		expect(screen.getByText("TypeScript")).toBeInTheDocument();
		expect(screen.getByText("2 tags")).toBeInTheDocument();
	});

	it("shows AI badge for ai_generated tags", () => {
		const skills = makeSkills([
			{ id: 1, name: "PyTorch", is_ai_generated: true },
		]);
		render(<SkillsSection skills={skills} />);

		expect(screen.getByText("PyTorch")).toBeInTheDocument();
		expect(screen.getByText("AI")).toBeInTheDocument();
	});

	it("does not show AI badge for manual tags", () => {
		const skills = makeSkills([
			{ id: 1, name: "React", is_ai_generated: false },
		]);
		render(<SkillsSection skills={skills} />);

		expect(screen.getByText("React")).toBeInTheDocument();
		expect(screen.queryByText("AI")).not.toBeInTheDocument();
	});

	it("shows edit controls in edit mode", () => {
		render(<SkillsSection skills={makeSkills()} editMode />);

		expect(screen.getByPlaceholderText("Type to search skills")).toBeInTheDocument();
		expect(screen.getByText("Add typed skill")).toBeInTheDocument();
		expect(screen.getByText("Save skills")).toBeInTheDocument();
		expect(screen.getByLabelText("Remove React")).toBeInTheDocument();
		expect(screen.getByLabelText("Remove TypeScript")).toBeInTheDocument();
	});

	it("allows removing tags in edit mode", async () => {
		const user = userEvent.setup();
		render(<SkillsSection skills={makeSkills()} editMode />);

		await user.click(screen.getByLabelText("Remove React"));

		expect(screen.queryByText("React")).not.toBeInTheDocument();
		expect(screen.getByText("TypeScript")).toBeInTheDocument();
		expect(screen.getByText("1 tags")).toBeInTheDocument();
	});

	it("shows search input in edit mode", () => {
		render(<SkillsSection skills={makeSkills()} editMode />);

		const input = screen.getByPlaceholderText("Type to search skills");
		expect(input).toBeInTheDocument();
	});

	it("calls onSave with updated tag list", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(<SkillsSection skills={makeSkills()} editMode onSave={onSave} />);

		// Remove a tag to create unsaved changes, then save
		await user.click(screen.getByLabelText("Remove TypeScript"));
		await user.click(screen.getByText("Save skills"));

		expect(onSave).toHaveBeenCalledWith(["React"]);
	});
});
