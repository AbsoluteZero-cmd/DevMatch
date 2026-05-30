export interface AuthTokens {
	access_token: string;
	refresh_token: string;
}

export const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';
const ACCESS_TOKEN_KEY = 'devmatch_access_token';
const REFRESH_TOKEN_KEY = 'devmatch_refresh_token';
const inFlightGetRequests = new Map<string, Promise<unknown>>();

let refreshPromise: Promise<AuthTokens> | null = null;

export function getStoredAuthTokens(): AuthTokens | null {
	if (typeof window === 'undefined') return null;

	const access_token = localStorage.getItem(ACCESS_TOKEN_KEY);
	const refresh_token = localStorage.getItem(REFRESH_TOKEN_KEY);

	if (!access_token || !refresh_token) return null;

	return { access_token, refresh_token };
}

export function getStoredAccessToken(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveAuthTokens(tokens: AuthTokens) {
	localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
	localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearAuthTokens() {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function buildAuthHeaders(extraHeaders?: HeadersInit): HeadersInit {
	const token = getStoredAccessToken();
	if (!token) {
		throw new Error('Missing access token for protected API call');
	}

	return {
		Authorization: `Bearer ${token}`,
		...(extraHeaders ?? {}),
	};
}

async function parseResponse<T>(response: Response): Promise<T> {
	const text = await response.text();
	if (!text) return undefined as unknown as T;
	return JSON.parse(text) as T;
}

export async function refreshAuthTokens(): Promise<AuthTokens> {
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		const refresh_token = getStoredRefreshToken();
		if (!refresh_token) {
			throw new Error('No refresh token available');
		}

		const response = await fetch(`${API_URL}/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refresh_token }),
		});

		if (!response.ok) {
			clearAuthTokens();
			throw new Error('Token refresh failed');
		}

		const tokens = (await response.json()) as AuthTokens;
		saveAuthTokens(tokens);
		return tokens;
	})().finally(() => {
		refreshPromise = null;
	});

	return refreshPromise;
}

export async function fetchProtectedApi<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const headers = buildAuthHeaders(options.headers ?? {});
	const response = await fetch(`${API_URL}${endpoint}`, {
		...options,
		headers,
	});

	if (response.status === 401) {
		try {
			await refreshAuthTokens();
		} catch {
			throw new Error('Session expired');
		}

		const retryHeaders = buildAuthHeaders(options.headers ?? {});
		const retryResponse = await fetch(`${API_URL}${endpoint}`, {
			...options,
			headers: retryHeaders,
		});

		if (!retryResponse.ok) {
			const body = await retryResponse.text();
			const error = new Error(
				`Protected API request failed with status ${retryResponse.status}: ${body}`,
			);
			(error as any).status = retryResponse.status;
			throw error;
		}

		return parseResponse<T>(retryResponse);
	}

	if (!response.ok) {
		const body = await response.text();
		const error = new Error(
			`Protected API request failed with status ${response.status}: ${body}`,
		);
		(error as any).status = response.status;
		throw error;
	}

	return parseResponse<T>(response);
}

async function fetchProtectedApiCached<T>(endpoint: string): Promise<T> {
	const cachedRequest = inFlightGetRequests.get(endpoint);
	if (cachedRequest) return cachedRequest as Promise<T>;

	const requestPromise = fetchProtectedApi<T>(endpoint).finally(() => {
		inFlightGetRequests.delete(endpoint);
	});

	inFlightGetRequests.set(endpoint, requestPromise);
	return requestPromise;
}

export async function getCurrentUser<T = unknown>(): Promise<T> {
	return fetchProtectedApiCached<T>('/auth/me');
}

export async function getMyProfile<T = unknown>(): Promise<T> {
	return fetchProtectedApiCached<T>('/profile/me');
}

export async function getAllSkillTags<T = unknown>(): Promise<T> {
	return fetchProtectedApiCached<T>('/profile/tags');
}

export async function getOAuthAuthorizationUrl<T = unknown>(
	provider: 'github' | 'huggingface',
): Promise<T> {
	return fetchProtectedApi<T>(`/oauth/${provider}/authorize`);
}

export async function getOAuthProviderStatus<T = unknown>(
	provider: 'github' | 'huggingface',
): Promise<T> {
	return fetchProtectedApiCached<T>(`/oauth/${provider}/status`);
}

export async function patchMyProfile<T = unknown>(payload: unknown): Promise<T> {
	return fetchProtectedApi<T>('/profile/me', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function createEducation<T = unknown>(payload: unknown): Promise<T> {
	return fetchProtectedApi<T>('/profile/education', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function updateEducation<T = unknown>(educationId: number, payload: unknown): Promise<T> {
	return fetchProtectedApi<T>(`/profile/education/${educationId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function deleteEducation(educationId: number): Promise<void> {
	await fetchProtectedApi<void>(`/profile/education/${educationId}`, {
		method: 'DELETE',
	});
}

export async function createProject<T = unknown>(payload: unknown): Promise<T> {
	return fetchProtectedApi<T>('/profile/projects', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function updateProject<T = unknown>(projectId: number, payload: unknown): Promise<T> {
	return fetchProtectedApi<T>(`/profile/projects/${projectId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function deleteProject(projectId: number): Promise<void> {
	await fetchProtectedApi<void>(`/profile/projects/${projectId}`, {
		method: 'DELETE',
	});
}

export async function createLink<T = unknown>(payload: unknown): Promise<T> {
	return fetchProtectedApi<T>('/profile/links', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function upsertLinks<T = unknown>(payload: unknown): Promise<T> {
	return fetchProtectedApi<T>('/profile/links', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function updateLink<T = unknown>(linkId: number, payload: unknown): Promise<T> {
	return fetchProtectedApi<T>(`/profile/links/${linkId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function deleteLink(linkId: number): Promise<void> {
	await fetchProtectedApi<void>(`/profile/links/${linkId}`, {
		method: 'DELETE',
	});
}

export async function addSkillTag<T = unknown>(payload: unknown): Promise<T> {
	return fetchProtectedApi<T>('/profile/tags', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function upsertSkillTags<T = unknown>(payload: unknown): Promise<T> {
	return fetchProtectedApi<T>('/profile/tags', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function removeSkillTag(tagId: number): Promise<void> {
	await fetchProtectedApi<void>(`/profile/tags/${tagId}`, {
		method: 'DELETE',
	});
}

export interface AnalyzeResponse {
	message: string;
	profile_id: string;
}

export interface AnalysisStatusResponse {
	last_ai_analysis: string | null;
}

export async function triggerAnalysis(): Promise<AnalyzeResponse> {
	return fetchProtectedApi<AnalyzeResponse>('/profile/analyze', {
		method: 'POST',
	});
}

export async function triggerAnalysisSync(): Promise<AnalyzeResponse> {
	return fetchProtectedApi<AnalyzeResponse>('/profile/analyze/sync', {
		method: 'POST',
	});
}

export async function getAnalysisStatus(): Promise<AnalysisStatusResponse> {
	return fetchProtectedApi<AnalysisStatusResponse>('/profile/analyze/status');
}

export async function logoutApi(): Promise<void> {
	try {
		await fetchProtectedApi<void>('/auth/logout', { method: 'POST' });
	} catch {
	}
	clearAuthTokens();
}


export async function getInbox<T = unknown>(): Promise<T> {
	return fetchProtectedApi<T>('/chatrooms/inbox');
}

export async function markInterested<T = unknown>(roomId: number): Promise<T> {
	return fetchProtectedApi<T>(`/chatrooms/inbox/${roomId}/interested`, {
		method: 'POST',
	});
}

export async function declineChatInvite<T = unknown>(roomId: number): Promise<T> {
	return fetchProtectedApi<T>(`/chatrooms/inbox/${roomId}/decline`, {
		method: 'POST',
	});
}

export async function joinTeam<T = unknown>(roomId: number): Promise<T> {
	return fetchProtectedApi<T>(`/chatrooms/inbox/${roomId}/join`, {
		method: 'POST',
	});
}

export async function cancelJoin<T = unknown>(roomId: number): Promise<T> {
	return fetchProtectedApi<T>(`/chatrooms/inbox/${roomId}/cancel-join`, {
		method: 'POST',
	});
}

export interface SendOfferPayload {
	team_id: string;
	recipient_id: number;
	job_posting_id: string;
	team_introduction?: string;
	proposed_role?: string;
	expected_contributions?: string;
	compensation_details?: string;
}

export async function sendOffer<T = unknown>(payload: SendOfferPayload): Promise<T> {
	return fetchProtectedApi<T>('/chatrooms/inbox/offer', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export interface TeamSummary {
	id: string;
	name: string;
	development_goal: string | null;
	description: string | null;
	visibility: string;
	leader_id: number;
	created_at: string;
	members: Array<{
		id: number;
		is_registered: boolean;
		user_id: number | null;
		unregistered_name: string | null;
		unregistered_role_description: string | null;
	}>;
	job_postings: Array<{
		id: string;
		title: string;
		required_role: string;
		role_description: string | null;
		min_skill_level: string;
		status: string;
		is_public: boolean;
		created_at: string;
	}>;
}

export async function listMyTeams(): Promise<TeamSummary[]> {
	return fetchProtectedApi<TeamSummary[]>('/teams');
}

export interface CreateTeamPayload {
	name: string;
	development_goal?: string | null;
	description?: string | null;
	visibility?: 'PUBLIC' | 'PRIVATE';
}

export async function createTeam<T = TeamSummary>(payload: CreateTeamPayload): Promise<T> {
	return fetchProtectedApi<T>('/teams', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export interface CreateJobPostingPayload {
	title: string;
	required_role: string;
	role_description?: string | null;
	min_skill_level?: string;
	is_public?: boolean;
}

export async function createJobPosting<T = unknown>(
	teamId: string,
	payload: CreateJobPostingPayload,
): Promise<T> {
	return fetchProtectedApi<T>(`/teams/${teamId}/postings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export interface UpdateJobPostingPayload {
	title?: string;
	role_description?: string | null;
	min_skill_level?: string;
	is_public?: boolean;
}

export async function updateJobPosting<T = unknown>(
	teamId: string,
	postingId: string,
	payload: UpdateJobPostingPayload,
): Promise<T> {
	return fetchProtectedApi<T>(`/teams/${teamId}/postings/${postingId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function closeJobPosting<T = unknown>(
	teamId: string,
	postingId: string,
): Promise<T> {
	return fetchProtectedApi<T>(`/teams/${teamId}/postings/${postingId}/close`, {
		method: 'POST',
	});
}

export interface TeamCapabilityRead {
	team_id: string;
	member_count: number;
	roles: Record<string, string>;
	overall_label: string;
}

export async function getTeamCapability(teamId: string): Promise<TeamCapabilityRead> {
	return fetchProtectedApi<TeamCapabilityRead>(`/teams/${teamId}/capability`);
}

export interface RoleRead {
	id: number;
	name: string;
	tier: string;
	skill_level: string;
}

export interface SkillTagRead {
	id: number;
	name: string;
	is_ai_generated: boolean;
}

export interface CandidateRead {
	profile_id: string;
	user_id?: number | null;
	full_name: string | null;
	match_score: number;
	rank: number;
	roles: RoleRead[];
	skill_tags: SkillTagRead[];
}

export async function getRecommendations(
	teamId: string,
	postingId: string,
	min_skill_level?: string,
	skill_tag?: string,
): Promise<CandidateRead[]> {
	const params = new URLSearchParams();
	if (min_skill_level) params.set('min_skill_level', min_skill_level);
	if (skill_tag) params.set('skill_tag', skill_tag);
	const qs = params.toString();
	const path = `/teams/${teamId}/postings/${postingId}/recommendations${qs ? `?${qs}` : ''}`;
	return fetchProtectedApi<CandidateRead[]>(path);
}

export interface TeamDiscoveryRead {
	id: string;
	name: string;
	development_goal: string | null;
	description: string | null;
	visibility: string;
	leader_id: number;
	created_at: string;
	member_count: number | null;
	members: TeamSummary['members'];
	job_postings: JobPostingRead[];
	redacted: boolean;
}

export async function discoverTeams(query?: string): Promise<TeamDiscoveryRead[]> {
	const qs = query ? `?query=${encodeURIComponent(query)}` : '';
	return fetchProtectedApi<TeamDiscoveryRead[]>(`/teams/discover${qs}`);
}

export interface UnregisteredMemberPayload {
	name: string;
	role: string;
	role_description?: string | null;
	experience_description?: string | null;
	skill_level: string;
}

export async function addUnregisteredMember<T = unknown>(
	teamId: string,
	payload: UnregisteredMemberPayload,
): Promise<T> {
	return fetchProtectedApi<T>(`/teams/${teamId}/members/unregistered`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

export async function removeTeamMember<T = unknown>(
	teamId: string,
	memberId: number,
): Promise<T> {
	return fetchProtectedApi<T>(`/teams/${teamId}/members/${memberId}`, {
		method: 'DELETE',
	});
}

export async function getRoomMessages<T = unknown>(roomId: number): Promise<T> {
	return fetchProtectedApi<T>(`/chatrooms/rooms/${roomId}/messages`);
}

export async function sendRoomMessage<T = unknown>(roomId: number, content: string): Promise<T> {
	return fetchProtectedApi<T>(`/chatrooms/rooms/${roomId}/messages`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content }),
	});
}

// ---------------------------------------------------------------------------
// Applications (FR-58 – FR-62)
// ---------------------------------------------------------------------------

export type ApplicationStatus =
	| 'pending'
	| 'reviewing'
	| 'accepted'
	| 'declined'
	| 'cancelled'
	| 'withdrawn'
	| 'closed';

export interface DeveloperApplicationOut {
	id: number;
	job_posting_id: string;
	applicant_id: number;
	status: ApplicationStatus;
	created_at: string;
}

export interface ApplicationOfferPayload {
	team_introduction: string;
	proposed_role: string;
	expected_contributions: string;
	compensation_details: string;
}

export async function applyToJob<T = DeveloperApplicationOut>(
	jobPostingId: string,
): Promise<T> {
	return fetchProtectedApi<T>(`/applications/apply/${jobPostingId}`, {
		method: 'POST',
	});
}

export async function getMyApplications<T = DeveloperApplicationOut[]>(): Promise<T> {
	return fetchProtectedApi<T>('/applications/applications/me');
}

export async function getApplication<T = DeveloperApplicationOut>(
	applicationId: number,
): Promise<T> {
	return fetchProtectedApi<T>(`/applications/applications/${applicationId}`);
}

export async function declineApplication<T = DeveloperApplicationOut>(
	applicationId: number,
): Promise<T> {
	return fetchProtectedApi<T>(
		`/applications/applications/${applicationId}/decline`,
		{ method: 'POST' },
	);
}

export async function acceptApplication<T = DeveloperApplicationOut>(
	applicationId: number,
	offerData: ApplicationOfferPayload,
): Promise<T> {
	return fetchProtectedApi<T>(
		`/applications/applications/${applicationId}/accept`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(offerData),
		},
	);
}

// ---------------------------------------------------------------------------
// Job Posting Discovery (for search page – FR-58)
// ---------------------------------------------------------------------------

export interface JobPostingRead {
	id: string;
	title: string;
	required_role: string;
	role_description: string | null;
	min_skill_level: string;
	status: string;
	is_public: boolean;
	created_at: string;
}
