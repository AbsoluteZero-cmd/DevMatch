export interface AuthTokens {
	access_token: string;
	refresh_token: string;
}

const API_URL =
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

export async function logoutApi(): Promise<void> {
	try {
		await fetchProtectedApi<void>('/auth/logout', { method: 'POST' });
	} catch {
	}
	clearAuthTokens();
}
