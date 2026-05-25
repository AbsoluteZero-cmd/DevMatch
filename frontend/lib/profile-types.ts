export type DegreeType =
	| 'PhD'
	| "Master's Degree"
	| "Bachelor's Degree"
	| 'High School Diploma'
	| 'Other';

export type RoleTier = 'Core' | 'Specialized';

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type ExternalURLType = 'GITHUB' | 'HUGGING_FACE' | 'LINKEDIN' | 'OTHER';

export type ExternalURLSource = 'MANUAL' | 'OAUTH_LINKED';

export type ExternalURLParseStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface EducationRead {
	id: number;
	institution_name: string;
	degree: DegreeType;
	major: string | null;
	graduation_year: number | null;
}

export interface ProjectHistoryRead {
	id: number;
	project_name: string;
	duration: string | null;
	role: string | null;
	technologies_used: string | null;
	description: string | null;
}

export interface ExternalURLRead {
	id: number;
	url_type: ExternalURLType;
	url_str: string;
	source: ExternalURLSource;
	parse_status: ExternalURLParseStatus;
	parse_message: string | null;
	parsed_at: string | null;
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