export type DegreeType =
	| 'PhD'
	| "Master's Degree"
	| "Bachelor's Degree"
	| 'High School Diploma'
	| 'Other';

export type RoleTier = 'Core' | 'Specialized';

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export const STANDARDIZED_ROLES = [
	'Frontend Engineer',
	'Backend Engineer',
	'Full-Stack Engineer',
	'Mobile Engineer (iOS / Android)',
	'DevOps / Infrastructure Engineer',
	'Data Engineer',
	'ML / AI Engineer',
	'Data Scientist',
	'Security Engineer',
	'QA Engineer',
] as const;

export type StandardizedRoleName = (typeof STANDARDIZED_ROLES)[number];

export const LEVEL_ORDER: readonly SkillLevel[] = [
	'Beginner',
	'Intermediate',
	'Advanced',
	'Expert',
] as const;

export type ExternalURLType = 'GITHUB' | 'HUGGING_FACE' | 'LINKEDIN' | 'OTHER';

export type ExternalURLSource = 'MANUAL' | 'OAUTH_LINKED';

export type ExternalURLParseStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface EducationRead {
	id: number;
	institution_name: string;
	degree: DegreeType;
	major: string | null;
	graduation_year: number | null;
	is_hidden: boolean;
}

export interface ProjectHistoryRead {
	id: number;
	project_name: string;
	duration: string | null;
	role: string | null;
	technologies_used: string | null;
	description: string | null;
	is_hidden: boolean;
}

export interface GitHubRepoRead {
	name: string;
	html_url: string;
	description: string | null;
	stargazers_count: number;
	forks_count: number;
	top_language: string | null;
}

export interface ExternalURLRead {
	id: number;
	url_type: ExternalURLType;
	url_str: string;
	source: ExternalURLSource;
	parse_status: ExternalURLParseStatus;
	parse_message: string | null;
	parsed_at: string | null;
	parsed_repo_list: GitHubRepoRead[] | null;
	parsed_commit_count: number | null;
	parsed_hf_model_count: number | null;
	parsed_hf_dataset_count: number | null;
}

export interface RoleRead {
	id: number;
	name: string;
	tier: RoleTier;
	skill_level: SkillLevel;
}

export interface SkillTagRead {
	id: number;
	name: string;
	is_ai_generated: boolean;
}

export interface ProfileRead {
	id: string;
	user_id: number;
	full_name: string | null;
	age: number | null;
	years_experience: number | null;
	is_hidden_full_name: boolean;
	is_hidden_age: boolean;
	is_hidden_years_experience: boolean;
	education_entries: EducationRead[];
	project_history_entries: ProjectHistoryRead[];
	external_urls: ExternalURLRead[];
	roles: RoleRead[];
	skill_tags: SkillTagRead[];
}

export interface ProfileProjectCard {
	id?: number;
	name: string;
	description: string;
	duration?: string | null;
	role?: string | null;
	technologies: string[];
	githubUrl?: string;
	liveUrl?: string;
	is_hidden?: boolean;
}

export interface ProfileSummaryStat {
	label: string;
	value: string;
}

export function splitTechnologiesUsed(value: string | null | undefined): string[] {
	if (!value) {
		return [];
	}

	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

export function extractGitHubUsername(url: string | null | undefined): string | null {
	if (!url) {
		return null;
	}

	try {
		const parsedUrl = new URL(url);
		if (parsedUrl.hostname !== 'github.com') {
			return null;
		}

		const username = parsedUrl.pathname.split('/').filter(Boolean)[0];
		return username ?? null;
	} catch {
		return null;
	}
}

export function extractHuggingFaceUsername(url: string | null | undefined): string | null {
	if (!url) {
		return null;
	}

	try {
		const parsedUrl = new URL(url);
		if (parsedUrl.hostname !== 'huggingface.co') {
			return null;
		}

		const username = parsedUrl.pathname.split('/').filter(Boolean)[0];
		return username ?? null;
	} catch {
		return null;
	}
}