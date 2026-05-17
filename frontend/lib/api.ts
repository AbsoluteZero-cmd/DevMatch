export interface AuthTokens {
	access_token: string;
	refresh_token: string;
}

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';
const ACCESS_TOKEN = 'devmatch_access_token';
const REFRESH_TOKEN = 'devmatch_refresh_token';

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

export async function getCurrentUser<T = unknown>(): Promise<T> {
	return fetchProtectedApi<T>('/auth/me');
}

export async function getMyProfile<T = unknown>(): Promise<T> {
	return fetchProtectedApi<T>('/profile/me');
}
