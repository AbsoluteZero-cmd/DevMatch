export interface AuthTokens {
	access_token: string;
	refresh_token: string;
}

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';
const ACCESS_TOKEN = 'devmatch_access_token';
const REFRESH_TOKEN = 'devmatch_refresh_token';
const inFlightGetRequests = new Map<string, Promise<unknown>>();

export function getStoredAuthTokens(): AuthTokens | null {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const stored = localStorage.getItem(ACCESS_TOKEN);
		if (!stored) {
			return null;
		}

		return JSON.parse(stored) as AuthTokens;
	} catch (error) {
		console.error('Failed to read auth tokens from storage:', error);
		localStorage.removeItem(ACCESS_TOKEN);
		localStorage.removeItem(REFRESH_TOKEN);
		return null;
	}
}

export function getStoredAccessToken(): string | null {
	const authTokens = getStoredAuthTokens();
	return authTokens?.access_token ?? null;
}

export function saveAuthTokens(tokens: AuthTokens) {
	localStorage.setItem(ACCESS_TOKEN, JSON.stringify(tokens));
	localStorage.setItem(REFRESH_TOKEN, JSON.stringify(tokens));
}

export function clearAuthTokens() {
	localStorage.removeItem(ACCESS_TOKEN);
	localStorage.removeItem(REFRESH_TOKEN);
}

export function buildAuthHeaders(extraHeaders?: HeadersInit): HeadersInit {
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
	if (!text) {
		return undefined as unknown as T;
	}
	return JSON.parse(text) as T;
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
	if (cachedRequest) {
		return cachedRequest as Promise<T>;
	}

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

// Education
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
	const headers = buildAuthHeaders();
	const resp = await fetch(`${API_URL}/profile/education/${educationId}`, {
		method: 'DELETE',
		headers,
	});
	if (!resp.ok) {
		const body = await resp.text();
		throw new Error(`Delete education failed: ${resp.status}: ${body}`);
	}
}

// Projects
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
	const headers = buildAuthHeaders();
	const resp = await fetch(`${API_URL}/profile/projects/${projectId}`, {
		method: 'DELETE',
		headers,
	});
	if (!resp.ok) {
		const body = await resp.text();
		throw new Error(`Delete project failed: ${resp.status}: ${body}`);
	}
}

// External links
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
	const headers = buildAuthHeaders();
	const resp = await fetch(`${API_URL}/profile/links/${linkId}`, {
		method: 'DELETE',
		headers,
	});
	if (!resp.ok) {
		const body = await resp.text();
		throw new Error(`Delete link failed: ${resp.status}: ${body}`);
	}
}

// Skill tags
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
	const headers = buildAuthHeaders();
	const resp = await fetch(`${API_URL}/profile/tags/${tagId}`, {
		method: 'DELETE',
		headers,
	});
	if (!resp.ok) {
		const body = await resp.text();
		throw new Error(`Remove skill tag failed: ${resp.status}: ${body}`);
	}
}
