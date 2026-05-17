'use client';

import { ProfileHero } from '@/components/profile-hero';
import { SkillsSection } from '@/components/skills-section';
import { ProjectsSection } from '@/components/projects-section';
import { GitHubLink } from '@/components/github-link';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

// Sample data for Sabrina's profile
const profileData = {
	name: 'Sabrina',
	university: 'KAIST',
	location: 'Daejeon, South Korea',
	bio: "Passionate computer science student focused on building impactful software. I love exploring the intersection of AI and web development, creating tools that make developers' lives easier. Currently working on projects involving machine learning and full-stack development.",
	avatarUrl:
		'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
};

const skills = [
	{ name: 'Rhino', level: 'Expert' as const },
	{ name: 'TypeScript', level: 'Advanced' as const },
	{ name: 'Python', level: 'Advanced' as const },
	{ name: 'Node.js', level: 'Intermediate' as const },
	{ name: 'Next.js', level: 'Advanced' as const },
	{ name: 'TailwindCSS', level: 'Expert' as const },
	{ name: 'PostgreSQL', level: 'Intermediate' as const },
	{ name: 'Machine Learning', level: 'Intermediate' as const },
	{ name: 'Docker', level: 'Beginner' as const },
	{ name: 'Git', level: 'Advanced' as const },
];

const projects = [
	{
		name: 'AI Study Buddy',
		description:
			'An AI-powered study assistant that helps students understand complex topics using GPT-4 and retrieval-augmented generation.',
		technologies: ['Python', 'FastAPI', 'React', 'OpenAI'],
		githubUrl: 'https://github.com/sabrina/ai-study-buddy',
		liveUrl: 'https://ai-study-buddy.vercel.app',
	},
	{
		name: 'Coupang Buddies',
		description: 'A platform for KAIST students to find coupang eats buddies',
		technologies: ['Next.js', 'TypeScript', 'TailwindCSS'],
		githubUrl: 'https://github.com/sabrina/campus-connect',
	},
	{
		name: 'Code Review Bot',
		description:
			'GitHub Action that automatically reviews PRs using AI, providing suggestions for code improvements and potential bugs.',
		technologies: ['TypeScript', 'GitHub Actions', 'OpenAI'],
		githubUrl: 'https://github.com/sabrina/code-review-bot',
	},
	{
		name: 'ML Pipeline Visualizer',
		description:
			'Interactive tool for visualizing and debugging machine learning pipelines, making it easier to understand data flow.',
		technologies: ['React', 'D3.js', 'Python', 'Flask'],
		githubUrl: 'https://github.com/SabrinaExample/ml-pipeline-viz',
		liveUrl: 'https://ml-pipeline-viz.vercel.app',
	},
];

export default function ProfilePage() {
	const auth = useAuth();
	const user = auth.user;

	const displayName = user?.full_name ?? profileData.name;
	const displayBio = user?.email
		? `Logged in as ${user.email}. Update your profile and see your recent activity.`
		: profileData.bio;

	useEffect(() => {
		console.log('ProfilePage mounted with user:', user);
	}, []);

	if (auth.isLoading) {
		return (
			<div className='flex h-screen items-center justify-center'>
				<div className='animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500'></div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className='flex h-screen items-center justify-center flex-col gap-4'>
				<p className='text-lg text-muted-foreground'>You are not logged in.</p>
				<a href='/login' className='text-blue-500 hover:underline'>
					Go to Login
				</a>
			</div>
		);
	}

	return (
		<main className='mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8'>
			<div className='space-y-8'>
				{/* Hero Section */}
				<ProfileHero
					name={displayName}
					university={profileData.university}
					location={profileData.location}
					bio={displayBio}
					avatarUrl={profileData.avatarUrl}
				/>

				{user && (
					<div className='rounded-xl border border-border bg-card p-6'>
						<div className='flex items-center justify-between gap-4'>
							<div>
								<p className='text-sm font-semibold text-muted-foreground'>
									Account
								</p>
								<h2 className='mt-2 text-2xl font-semibold text-foreground'>
									Logged in user
								</h2>
							</div>
						</div>
						<div className='mt-6 grid gap-4 sm:grid-cols-2'>
							<div className='rounded-lg border border-border bg-background/50 p-4'>
								<p className='text-sm text-muted-foreground'>Name</p>
								<p className='mt-1 text-base font-medium text-foreground'>
									{user.full_name}
								</p>
							</div>
							<div className='rounded-lg border border-border bg-background/50 p-4'>
								<p className='text-sm text-muted-foreground'>Email</p>
								<p className='mt-1 text-base font-medium text-foreground'>
									{user.email}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Skills Section */}
				<SkillsSection skills={skills} />

				{/* Projects Section */}
				<ProjectsSection projects={projects} />

				{/* GitHub Link */}
				<GitHubLink username='SabrinaExample-dev' />
			</div>
		</main>
	);
}
