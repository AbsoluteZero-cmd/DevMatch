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
	saveAuthTokens,
} from '@/lib/api';

export type UserRole = 'developer' | 'team-leader';

export interface User {
	id: string;
	name: string;
	email: string;
	role?: UserRole;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	login: (credentials: LoginCredentials) => Promise<AuthTokens>;
	logout: () => void;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

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
					name: currentUser.full_name,
					email: currentUser.email,
				});
			} catch (error) {
				console.error('Failed to restore auth state:', error);
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
			const errorText = await response.text();
			console.error('Login failed with status:', response.status, errorText);
			throw new Error('Login failed');
		}

		const authData = (await response.json()) as AuthTokens;
		saveAuthTokens(authData);

		try {
			const currentUser = await getCurrentUser<{
				id: number;
				full_name: string;
				email: string;
			}>();
			setUser({
				id: currentUser.id.toString(),
				name: currentUser.full_name,
				email: currentUser.email,
			});
		} catch (error) {
			console.error('Unable to load user information after login', error);
		}

		return authData;
	};

	const logout = () => {
		setUser(null);
		clearAuthTokens();
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				login,
				logout,
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
