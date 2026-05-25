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
import {
	User,
	Users,
	Eye,
	EyeOff,
	AlertCircle,
	CheckCircle2,
	Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

type AccountType = 'developer' | 'team-leader';

export default function RegisterPage() {
	const router = useRouter();
	const auth = useAuth();
	const { register, user } = auth;

	const [accountType, setAccountType] = useState<AccountType>('developer');
	const [showPassword, setShowPassword] = useState(false);
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [touched, setTouched] = useState({
		name: false,
		email: false,
		password: false,
	});
	const [isLoading, setIsLoading] = useState(false);

	const isPasswordValid = password.length >= 8;
	const isEmailValid = email.includes('@') && email.includes('.');
	const isNameValid = name.trim().length > 0;

	const canSubmit = isNameValid && isEmailValid && isPasswordValid;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (canSubmit) {
			setIsLoading(true);
			// Simulate API call
			const result = await register({
				full_name: name,
				email,
				password,
				role: accountType,
			});
			setIsLoading(false);
			// Redirect to dashboard after successful registration
			router.push('/login');
		}
	};

	useEffect(() => {
		if (user) {
			router.push('/dashboard');
		}
	}, [user, router]);

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
						<CardTitle className='text-2xl font-bold'>
							Create your account
						</CardTitle>
						<CardDescription>
							Join DevMatch and start collaborating with developers
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-6'>
							{/* Account Type Toggle */}
							<div className='space-y-3'>
								<Label className='text-sm font-medium text-foreground'>
									I am a...
								</Label>
								<div className='grid grid-cols-2 gap-3'>
									<button
										type='button'
										onClick={() => setAccountType('developer')}
										className={cn(
											'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
											accountType === 'developer'
												? 'border-primary bg-primary/5'
												: 'border-border bg-card hover:border-muted-foreground/30',
										)}
									>
										<User
											className={cn(
												'h-6 w-6',
												accountType === 'developer'
													? 'text-primary'
													: 'text-muted-foreground',
											)}
										/>
										<span
											className={cn(
												'text-sm font-medium',
												accountType === 'developer'
													? 'text-primary'
													: 'text-foreground',
											)}
										>
											Developer
										</span>
										<span className='text-xs text-muted-foreground'>
											Find teams & projects
										</span>
									</button>
									<button
										type='button'
										onClick={() => setAccountType('team-leader')}
										className={cn(
											'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
											accountType === 'team-leader'
												? 'border-primary bg-primary/5'
												: 'border-border bg-card hover:border-muted-foreground/30',
										)}
									>
										<Users
											className={cn(
												'h-6 w-6',
												accountType === 'team-leader'
													? 'text-primary'
													: 'text-muted-foreground',
											)}
										/>
										<span
											className={cn(
												'text-sm font-medium',
												accountType === 'team-leader'
													? 'text-primary'
													: 'text-foreground',
											)}
										>
											Team Leader
										</span>
										<span className='text-xs text-muted-foreground'>
											Recruit developers
										</span>
									</button>
								</div>
							</div>

							{/* Name Field */}
							<div className='space-y-2'>
								<Label htmlFor='name'>Full Name</Label>
								<Input
									id='name'
									type='text'
									placeholder='Enter your name'
									value={name}
									onChange={(e) => setName(e.target.value)}
									onBlur={() => setTouched((t) => ({ ...t, name: true }))}
									className={cn(
										touched.name &&
											!isNameValid &&
											'border-destructive focus-visible:ring-destructive',
									)}
								/>
								{touched.name && !isNameValid && (
									<p className='flex items-center gap-1 text-xs text-destructive'>
										<AlertCircle className='h-3 w-3' />
										Please enter your name
									</p>
								)}
							</div>

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
								<Label htmlFor='password'>Password</Label>
								<div className='relative'>
									<Input
										id='password'
										type={showPassword ? 'text' : 'password'}
										placeholder='Create a password'
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										onBlur={() => setTouched((t) => ({ ...t, password: true }))}
										className={cn(
											'pr-10',
											touched.password &&
												!isPasswordValid &&
												'border-destructive focus-visible:ring-destructive',
										)}
									/>
									<button
										type='button'
										onClick={() => setShowPassword(!showPassword)}
										className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
									>
										{showPassword ? (
											<EyeOff className='h-4 w-4' />
										) : (
											<Eye className='h-4 w-4' />
										)}
									</button>
								</div>
								<p
									className={cn(
										'flex items-center gap-1 text-xs',
										isPasswordValid
											? 'text-green-600'
											: 'text-muted-foreground',
									)}
								>
									{isPasswordValid ? (
										<CheckCircle2 className='h-3 w-3' />
									) : (
										<AlertCircle className='h-3 w-3' />
									)}
									Password must be at least 8 characters
								</p>
							</div>

							{/* Submit Button */}
							<Button
								type='submit'
								className='w-full'
								disabled={!canSubmit || isLoading}
							>
								{isLoading ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										Creating account...
									</>
								) : (
									'Create Account'
								)}
							</Button>

							{/* Sign In Link */}
							<p className='text-center text-sm text-muted-foreground'>
								Already have an account?{' '}
								<Link
									href='/login'
									className='font-medium text-primary hover:underline'
								>
									Sign in
								</Link>
							</p>
						</form>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
