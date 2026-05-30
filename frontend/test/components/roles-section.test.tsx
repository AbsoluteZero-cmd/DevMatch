import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RolesSection } from "@/components/roles-section";
import type { RoleRead } from "@/lib/profile-types";

function makeRole(overrides: Partial<RoleRead> = {}): RoleRead {
	return {
		id: 1,
		name: "Frontend Engineer",
		tier: "Core",
		skill_level: "Advanced",
		...overrides,
	};
}

describe("RolesSection", () => {
	it("renders role cards with name and skill level", () => {
		render(<RolesSection roles={[makeRole()]} />);

		expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
		expect(screen.getByText("Advanced")).toBeInTheDocument();
	});

	it("shows empty state when no roles", () => {
		render(<RolesSection roles={[]} />);

		expect(
			screen.getByText("No roles have been assigned to this profile yet."),
		).toBeInTheDocument();
	});

	it("applies correct tier styling for Core roles", () => {
		render(<RolesSection roles={[makeRole({ tier: "Core" })]} />);

		const badge = screen.getByText("Advanced");
		expect(badge.className).toContain("purple");
	});

	it("displays all role names", () => {
		const roles: RoleRead[] = [
			makeRole({ id: 1, name: "Frontend Engineer", skill_level: "Advanced" }),
			makeRole({ id: 2, name: "Backend Engineer", skill_level: "Expert" }),
			makeRole({
				id: 3,
				name: "ML / AI Engineer",
				tier: "Specialized",
				skill_level: "Intermediate",
			}),
		];

		render(<RolesSection roles={roles} />);

		expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
		expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
		expect(screen.getByText("ML / AI Engineer")).toBeInTheDocument();
		expect(screen.getByText("3 roles")).toBeInTheDocument();
	});

	// FR-33: Beginner roles should be filtered out (defensive check)
	it("filters out Beginner roles", () => {
		const roles: RoleRead[] = [
			makeRole({ id: 1, name: "Frontend Engineer", skill_level: "Advanced" }),
			makeRole({ id: 2, name: "Backend Engineer", skill_level: "Beginner" }),
		];

		render(<RolesSection roles={roles} />);

		expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
		expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument();
	});

	it("shows empty state when all roles are Beginner", () => {
		const roles: RoleRead[] = [
			makeRole({ id: 1, name: "Frontend Engineer", skill_level: "Beginner" }),
			makeRole({ id: 2, name: "Backend Engineer", skill_level: "Beginner" }),
		];

		render(<RolesSection roles={roles} />);

		expect(
			screen.getByText("No roles have been assigned to this profile yet."),
		).toBeInTheDocument();
	});

	it("displays correct count excluding Beginner roles", () => {
		const roles: RoleRead[] = [
			makeRole({ id: 1, name: "Frontend Engineer", skill_level: "Beginner" }),
			makeRole({ id: 2, name: "Backend Engineer", skill_level: "Advanced" }),
			makeRole({ id: 3, name: "QA Engineer", tier: "Specialized", skill_level: "Expert" }),
		];

		render(<RolesSection roles={roles} />);

		expect(screen.getByText("2 roles")).toBeInTheDocument();
	});

	it("renders Intermediate roles with correct badge", () => {
		render(<RolesSection roles={[makeRole({ skill_level: "Intermediate" })]} />);

		const badge = screen.getByText("Intermediate");
		expect(badge).toBeInTheDocument();
		expect(badge.className).toContain("blue");
	});

	it("renders Expert roles with correct badge", () => {
		render(<RolesSection roles={[makeRole({ skill_level: "Expert" })]} />);

		const badge = screen.getByText("Expert");
		expect(badge).toBeInTheDocument();
		expect(badge.className).toContain("green");
	});

	it("applies Specialized tier styling", () => {
		render(<RolesSection roles={[makeRole({ tier: "Specialized", skill_level: "Advanced" })]} />);

		const badge = screen.getByText("Advanced");
		expect(badge).toBeInTheDocument();
	});

	it("renders role description with tier label", () => {
		render(<RolesSection roles={[makeRole({ tier: "Core" })]} />);

		expect(screen.getByText("Core role")).toBeInTheDocument();
	});

	it("renders Specialized tier label", () => {
		render(<RolesSection roles={[makeRole({ tier: "Specialized" })]} />);

		expect(screen.getByText("Specialized role")).toBeInTheDocument();
	});
});
