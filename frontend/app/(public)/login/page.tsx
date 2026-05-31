'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
	const { login, user } = useAuth();
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [touched, setTouched] = useState({ email: false, password: false });
	const [authRequired, setAuthRequired] = useState(false);
	const [redirectPath, setRedirectPath] = useState('/dashboard');

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		setAuthRequired(params.get('authRequired') === '1');
		const redirect = params.get('redirect');
		// only allow internal redirects to avoid open-redirect issues
		if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
			setRedirectPath(redirect);
		}
	}, []);

	const isEmailValid = email.includes('@') && email.includes('.');
	const isPasswordValid = password.length >= 1;
	const canSubmit = isEmailValid && isPasswordValid && !isLoading;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit) return;

		setIsLoading(true);
		setError('');

		try {
			await login({ email, password });
			router.push(redirectPath);
		} catch {
			setError('Login failed. Please check your credentials and try again.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (user) {
			router.push(redirectPath);
		}
	}, [user, router, redirectPath]);

	if (user) return null;

	return (
		<div className='flex min-h-screen flex-col bg-background'>
			{/* Simple Header */}
			<header className='border-b border-border bg-card/80 backdrop-blur-sm'>
				<div className='mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8'>
					<Link href='/' className='flex items-center gap-2'>
						<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary'>
							<span className='text-sm font-bold text-primary-foreground'>
								D
							</span>
						</div>
						<span className='text-xl font-semibold text-foreground'>
							DevMatch
						</span>
					</Link>
				</div>
			</header>

			<main className='flex flex-1 items-center justify-center px-4 py-12'>
				<Card className='w-full max-w-md border-border bg-card'>
					<CardHeader className='space-y-1 text-center'>
						<CardTitle className='text-2xl font-bold'>Welcome back</CardTitle>
						<CardDescription>Sign in to your DevMatch account</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-6'>
							{authRequired && !error && (
								<div className='flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700'>
									<AlertCircle className='h-4 w-4' />
									Authorization required. Please sign in to continue.
								</div>
							)}

							{error && (
								<div className='flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive'>
									<AlertCircle className='h-4 w-4' />
									{error}
								</div>
							)}

							{/* Email Field */}
							<div className='space-y-2'>
								<Label htmlFor='email'>Email</Label>
								<Input
									id='email'
									type='email'
									placeholder='you@example.com'
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									onBlur={() => setTouched((t) => ({ ...t, email: true }))}
									disabled={isLoading}
									className={cn(
										touched.email &&
											!isEmailValid &&
											'border-destructive focus-visible:ring-destructive',
									)}
								/>
								{touched.email && !isEmailValid && (
									<p className='flex items-center gap-1 text-xs text-destructive'>
										<AlertCircle className='h-3 w-3' />
										Please enter a valid email address
									</p>
								)}
							</div>

							{/* Password Field */}
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<Label htmlFor='password'>Password</Label>
									<Link
										href='/forgot-password'
										className='text-xs text-primary hover:underline'
									>
										Forgot password?
									</Link>
								</div>
								<div className='relative'>
									<Input
										id='password'
										type={showPassword ? 'text' : 'password'}
										placeholder='Enter your password'
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										onBlur={() => setTouched((t) => ({ ...t, password: true }))}
										disabled={isLoading}
										className='pr-10'
									/>
									<button
										type='button'
										onClick={() => setShowPassword(!showPassword)}
										className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
										disabled={isLoading}
									>
										{showPassword ? (
											<EyeOff className='h-4 w-4' />
										) : (
											<Eye className='h-4 w-4' />
										)}
									</button>
								</div>
							</div>

							{/* Submit Button */}
							<Button type='submit' className='w-full' disabled={!canSubmit}>
								{isLoading ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										Signing in...
									</>
								) : (
									'Sign In'
								)}
							</Button>

							{/* Register Link */}
							<p className='text-center text-sm text-muted-foreground'>
								{"Don't have an account?"}{' '}
								<Link
									href='/register'
									className='font-medium text-primary hover:underline'
								>
									Create one
								</Link>
							</p>
						</form>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
