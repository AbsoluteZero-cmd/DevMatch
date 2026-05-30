import { describe, it, expect } from "vitest";
import {
	splitTechnologiesUsed,
	extractGitHubUsername,
	extractHuggingFaceUsername,
	STANDARDIZED_ROLES,
	LEVEL_ORDER,
} from "@/lib/profile-types";

describe("splitTechnologiesUsed", () => {
	it("splits comma-separated values", () => {
		expect(splitTechnologiesUsed("React, TypeScript, Node.js")).toEqual([
			"React",
			"TypeScript",
			"Node.js",
		]);
	});

	it("trims whitespace", () => {
		expect(splitTechnologiesUsed("  React ,  TypeScript  ")).toEqual([
			"React",
			"TypeScript",
		]);
	});

	it("filters empty strings", () => {
		expect(splitTechnologiesUsed("React,,, TypeScript")).toEqual([
			"React",
			"TypeScript",
		]);
	});

	it("returns empty array for null", () => {
		expect(splitTechnologiesUsed(null)).toEqual([]);
	});

	it("returns empty array for undefined", () => {
		expect(splitTechnologiesUsed(undefined)).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		expect(splitTechnologiesUsed("")).toEqual([]);
	});

	it("handles single value", () => {
		expect(splitTechnologiesUsed("Python")).toEqual(["Python"]);
	});
});

describe("extractGitHubUsername", () => {
	it("extracts username from valid GitHub URL", () => {
		expect(extractGitHubUsername("https://github.com/octocat")).toBe(
			"octocat",
		);
	});

	it("extracts username from URL with trailing slash", () => {
		expect(extractGitHubUsername("https://github.com/octocat/")).toBe(
			"octocat",
		);
	});

	it("returns null for non-GitHub domain", () => {
		expect(extractGitHubUsername("https://gitlab.com/octocat")).toBeNull();
	});

	it("returns null for invalid URL", () => {
		expect(extractGitHubUsername("not-a-url")).toBeNull();
	});

	it("returns null for null", () => {
		expect(extractGitHubUsername(null)).toBeNull();
	});

	it("returns null for undefined", () => {
		expect(extractGitHubUsername(undefined)).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(extractGitHubUsername("")).toBeNull();
	});
});

describe("extractHuggingFaceUsername", () => {
	it("extracts username from valid HuggingFace URL", () => {
		expect(
			extractHuggingFaceUsername("https://huggingface.co/gpt2"),
		).toBe("gpt2");
	});

	it("extracts username from URL with trailing slash", () => {
		expect(
			extractHuggingFaceUsername("https://huggingface.co/gpt2/"),
		).toBe("gpt2");
	});

	it("returns null for non-HuggingFace domain", () => {
		expect(
			extractHuggingFaceUsername("https://github.com/gpt2"),
		).toBeNull();
	});

	it("returns null for invalid URL", () => {
		expect(extractHuggingFaceUsername("not-a-url")).toBeNull();
	});

	it("returns null for null", () => {
		expect(extractHuggingFaceUsername(null)).toBeNull();
	});

	it("returns null for undefined", () => {
		expect(extractHuggingFaceUsername(undefined)).toBeNull();
	});
});

// FR-29: Standardized roles must match SRS specification
describe("STANDARDIZED_ROLES", () => {
	it("contains exactly 10 roles", () => {
		expect(STANDARDIZED_ROLES).toHaveLength(10);
	});

	it("matches SRS specification role names", () => {
		const expected = [
			"Frontend Engineer",
			"Backend Engineer",
			"Full-Stack Engineer",
			"Mobile Engineer (iOS / Android)",
			"DevOps / Infrastructure Engineer",
			"Data Engineer",
			"ML / AI Engineer",
			"Data Scientist",
			"Security Engineer",
			"QA Engineer",
		];
		expect([...STANDARDIZED_ROLES]).toEqual(expected);
	});

	it("contains 6 Core and 4 Specialized roles", () => {
		const coreRoles = STANDARDIZED_ROLES.slice(0, 6);
		const specializedRoles = STANDARDIZED_ROLES.slice(6);
		expect(coreRoles).toHaveLength(6);
		expect(specializedRoles).toHaveLength(4);
	});
});

// FR-30: Skill level ordering
describe("LEVEL_ORDER", () => {
	it("contains exactly 4 levels", () => {
		expect(LEVEL_ORDER).toHaveLength(4);
	});

	it("orders levels from lowest to highest", () => {
		expect([...LEVEL_ORDER]).toEqual([
			"Beginner",
			"Intermediate",
			"Advanced",
			"Expert",
		]);
	});
});
