'use client';

import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import {
	AuthTokens,
	clearAuthTokens,
	getCurrentUser,
	getStoredAuthTokens,
	getStoredAccessToken,
	saveAuthTokens,
	logoutApi,
} from '@/lib/api';

export type UserRole = 'developer' | 'team-leader';

export interface User {
	id: string;
	full_name: string;
	email: string;
	role?: UserRole;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterCredentials {
	full_name: string;
	email: string;
	password: string;
	role: UserRole;
}

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	accessToken: string | null;
	login: (credentials: LoginCredentials) => Promise<AuthTokens>;
	register: (credentials: RegisterCredentials) => Promise<unknown>;
	logout: () => void;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken());

	useEffect(() => {
		const restoreAuth = async () => {
			const storedTokens = getStoredAuthTokens();
			if (!storedTokens) {
				setIsLoading(false);
				return;
			}

			try {
				const currentUser = await getCurrentUser<{
					id: number;
					full_name: string;
					email: string;
				}>();
				setUser({
					id: currentUser.id.toString(),
					full_name: currentUser.full_name,
					email: currentUser.email,
				});
			} catch {
				clearAuthTokens();
			} finally {
				setIsLoading(false);
			}
		};

		restoreAuth();
	}, []);

	const login = async (credentials: LoginCredentials) => {
		const body = new URLSearchParams();
		body.append('username', credentials.email);
		body.append('password', credentials.password);

		const response = await fetch(
			process.env.NEXT_PUBLIC_BACKEND_URL
				? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/login`
				: 'http://localhost:8000/api/v1/auth/login',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: body.toString(),
			},
		);

		if (!response.ok) {
			throw new Error('Login failed');
		}

		const authData = (await response.json()) as AuthTokens;
		saveAuthTokens(authData);
		setAccessToken(authData.access_token);

		try {
			const currentUser = await getCurrentUser<{
				id: number;
				full_name: string;
				email: string;
			}>();
			setUser({
				id: currentUser.id.toString(),
				full_name: currentUser.full_name,
				email: currentUser.email,
			});
		} catch {
			// tokens saved, user will be loaded on next navigation
		}

		return authData;
	};

	const register = async (credentials: RegisterCredentials) => {
		const backendRole =
			credentials.role === 'team-leader' ? 'TEAM_LEADER' : 'DEVELOPER';

		const response = await fetch(
			process.env.NEXT_PUBLIC_BACKEND_URL
				? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/register`
				: 'http://localhost:8000/api/v1/auth/register',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					full_name: credentials.full_name,
					email: credentials.email,
					password: credentials.password,
					role: backendRole,
				}),
			},
		);

		if (!response.ok) {
			throw new Error('Registration failed');
		}

		return response.json();
	};

	const logout = () => {
		logoutApi();
		setUser(null);
		setAccessToken(null);
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				accessToken,
				login,
				logout,
				register,
				isAuthenticated: !!user,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
