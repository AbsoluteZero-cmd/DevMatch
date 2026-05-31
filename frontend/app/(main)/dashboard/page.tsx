'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
	closeJobPosting,
	createTeam,
	createJobPosting,
	getCurrentUser,
	getMyApplications,
	getRecommendations,
	getTeamCapability,
	listMyTeams,
	sendOffer,
	updateJobPosting,
	addUnregisteredMember,
	removeTeamMember,
	type CandidateRead,
	type DeveloperApplicationOut,
	type TeamCapabilityRead,
	type TeamSummary,
} from '@/lib/api';
import { type SkillLevel } from '@/lib/profile-types';
import {
	Briefcase,
	FolderPlus,
	CheckCircle2,
	ClipboardList,
	Clock,
	Plus,
	Loader2,
	Search,
	Send,
	Rocket,
	Users,
	XCircle,
} from 'lucide-react';

interface Developer {
	id: string;
	name: string;
	avatar: string;
	role: string;
	skillLevel: SkillLevel;
	university: string;
	topSkills: string[];
	offerSent: boolean;
	userId: number | null;
}

interface OfferForm {
	team_id: string;
	job_posting_id: string;
	recipient_id: string;
	proposed_role: string;
	team_introduction: string;
	expected_contributions: string;
	compensation_details: string;
}

interface JobPostingForm {
	title: string;
	required_role: string;
	role_description: string;
	min_skill_level: string;
	is_public: boolean;
}

interface TeamForm {
	name: string;
	development_goal: string;
	description: string;
	visibility: 'PUBLIC' | 'PRIVATE';
}

interface CurrentUser {
	id: number;
	full_name?: string | null;
	role?: string | null;
}

const roleOptions = [
	'Frontend Engineer',
	'Backend Engineer',
	'Full-Stack Engineer',
	'Mobile Engineer (iOS / Android)',
	'DevOps / Infrastructure Engineer',
	'Data Engineer',
	'ML / AI Engineer',
	'Data Scientist',
	'Security Engineer',
	'QA Engineer',
];

const skillOptions = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const levelStyles: Record<SkillLevel, string> = {
	Beginner: 'bg-muted text-muted-foreground',
	Intermediate: 'bg-primary/20 text-primary',
	Advanced: 'bg-primary/30 text-primary',
	Expert: 'bg-primary text-primary-foreground',
};

function emptyOfferForm(developer: Developer | null): OfferForm {
	return {
		team_id: '',
		job_posting_id: '',
		recipient_id:
			developer?.userId !== null && developer?.userId !== undefined
				? String(developer.userId)
				: '',
		proposed_role: developer?.role ?? '',
		team_introduction: '',
		expected_contributions: '',
		compensation_details: '',
	};
}

function emptyPostingForm(): JobPostingForm {
	return {
		title: '',
		required_role: 'Frontend Engineer',
		role_description: '',
		min_skill_level: 'Intermediate',
		is_public: true,
	};
}

function emptyTeamForm(): TeamForm {
	return {
		name: '',
		development_goal: '',
		description: '',
		visibility: 'PUBLIC',
	};
}

function mapRecommendation(candidate: CandidateRead): Developer {
	const primaryRole = candidate.roles[0];
	return {
		id: candidate.profile_id,
		name: candidate.full_name ?? 'Anonymous',
		avatar: '',
		role: primaryRole?.name ?? 'Developer',
		skillLevel: (primaryRole?.skill_level as SkillLevel) ?? 'Intermediate',
		university: '',
		topSkills: candidate.skill_tags.map((tag) => tag.name),
		offerSent: false,
		userId: candidate.user_id ?? null,
	};
}

function LeaderDashboard() {
	const [teams, setTeams] = useState<TeamSummary[] | null>(null);
	const [teamsError, setTeamsError] = useState<string | null>(null);
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
	const [selectedTeamId, setSelectedTeamId] = useState<string>('');
	const [selectedPostingId, setSelectedPostingId] = useState<string>('');
	const [capability, setCapability] = useState<TeamCapabilityRead | null>(null);
	const [capabilityLoading, setCapabilityLoading] = useState(false);
	const [capabilityError, setCapabilityError] = useState<string | null>(null);

	const [developers, setDevelopers] = useState<Developer[]>([]);
	const [developersLoading, setDevelopersLoading] = useState(false);
	const [developersError, setDevelopersError] = useState<string | null>(null);

	const [offerTarget, setOfferTarget] = useState<Developer | null>(null);
	const [form, setForm] = useState<OfferForm>(emptyOfferForm(null));
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [postingOpen, setPostingOpen] = useState(false);
	const [postingForm, setPostingForm] =
		useState<JobPostingForm>(emptyPostingForm());
	const [postingSubmitting, setPostingSubmitting] = useState(false);
	const [postingError, setPostingError] = useState<string | null>(null);
	const [editingPosting, setEditingPosting] = useState<null | { id: string }>(
		null,
	);

	const [teamOpen, setTeamOpen] = useState(false);
	const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeamForm());
	const [teamSubmitting, setTeamSubmitting] = useState(false);
	const [teamError, setTeamError] = useState<string | null>(null);
	const [closingPostingId, setClosingPostingId] = useState<string | null>(null);
	const [filterLevel, setFilterLevel] = useState<string>('');
	const [filterTag, setFilterTag] = useState<string>('');
	const [membersOpen, setMembersOpen] = useState(false);
	const [memberName, setMemberName] = useState('');
	const [memberRole, setMemberRole] = useState('');
	const [memberLevel, setMemberLevel] = useState('Intermediate');
	const [memberExperience, setMemberExperience] = useState('');
	const [membersSubmitting, setMembersSubmitting] = useState(false);
	const [membersError, setMembersError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		listMyTeams()
			.then((data) => {
				if (cancelled) return;
				setTeams(data);
				setSelectedTeamId((current) => current || data[0]?.id || '');
			})
			.catch((err) => {
				if (cancelled) return;
				const status = (err as { status?: number })?.status;
				setTeamsError(
					status === 403
						? 'Only team leaders can send offers.'
						: 'Could not load your teams.',
				);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;

		getCurrentUser<CurrentUser>()
			.then((user) => {
				if (!cancelled) setCurrentUser(user);
			})
			.catch(() => {
				if (!cancelled) setCurrentUser(null);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const selectedTeam = useMemo(
		() => teams?.find((team) => team.id === selectedTeamId) ?? null,
		[selectedTeamId, teams],
	);
	const leaderName = useMemo(() => {
		if (!selectedTeam) return null;
		if (currentUser?.id === selectedTeam.leader_id && currentUser.full_name) {
			return currentUser.full_name;
		}
		return 'Team Leader';
	}, [currentUser, selectedTeam]);

	const overallLevel = capability?.overall_label ?? 'N/A';
	const capabilityPercent =
		overallLevel === 'Beginner'
			? 25
			: overallLevel === 'Intermediate'
				? 50
				: overallLevel === 'Advanced'
					? 75
					: overallLevel === 'Expert'
						? 100
						: 0;

	const openPostings =
		selectedTeam?.job_postings.filter((posting) => posting.status === 'OPEN') ??
		[];

	useEffect(() => {
		if (!selectedTeam) {
			setSelectedPostingId('');
			return;
		}

		const nextPostingId = openPostings[0]?.id ?? '';
		if (
			!selectedPostingId ||
			!openPostings.some((posting) => posting.id === selectedPostingId)
		) {
			setSelectedPostingId(nextPostingId);
		}
	}, [openPostings, selectedPostingId, selectedTeam]);

	useEffect(() => {
		let cancelled = false;

		if (!selectedTeamId) {
			setCapability(null);
			setCapabilityError(null);
			return;
		}

		setCapabilityLoading(true);
		setCapabilityError(null);
		getTeamCapability(selectedTeamId)
			.then((data) => {
				if (!cancelled) setCapability(data);
			})
			.catch((err) => {
				if (cancelled) return;
				const status = (err as { status?: number })?.status;
				setCapability(null);
				setCapabilityError(
					status === 403
						? 'Only team members can view the capability profile.'
						: 'Could not load capability summary.',
				);
			})
			.finally(() => {
				if (!cancelled) setCapabilityLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [selectedTeamId]);

	useEffect(() => {
		let cancelled = false;

		if (!selectedTeamId || !selectedPostingId) {
			setDevelopers([]);
			setDevelopersError(null);
			return;
		}

		setDevelopersLoading(true);
		setDevelopersError(null);
		getRecommendations(
			selectedTeamId,
			selectedPostingId,
			filterLevel || undefined,
			filterTag || undefined,
		)
			.then((recs) => {
				if (!cancelled) setDevelopers(recs.map(mapRecommendation));
			})
			.catch((err) => {
				if (cancelled) return;
				const status = (err as { status?: number })?.status;
				setDevelopers([]);
				setDevelopersError(
					status === 404
						? 'Select an open posting to view recommendations.'
						: 'Could not load recommendations.',
				);
			})
			.finally(() => {
				if (!cancelled) setDevelopersLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [selectedTeamId, selectedPostingId, filterLevel, filterTag]);

	const openOffer = (developer: Developer) => {
		setOfferTarget(developer);
		setForm(emptyOfferForm(developer));
		setError(null);
	};

	const closeOffer = () => {
		if (submitting) return;
		setOfferTarget(null);
		setError(null);
	};

	const updateField = (key: keyof OfferForm, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const refreshTeams = async () => {
		const updated = await listMyTeams();
		setTeams(updated);
		if (!updated.some((team) => team.id === selectedTeamId)) {
			setSelectedTeamId(updated[0]?.id || '');
		}
	};

	const handleTeamChange = (teamId: string) => {
		setForm((prev) => ({ ...prev, team_id: teamId, job_posting_id: '' }));
		setSelectedTeamId(teamId);
	};

	const submitPosting = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!selectedTeam) return;

		if (!postingForm.title.trim()) {
			setPostingError('Posting title is required.');
			return;
		}

		setPostingSubmitting(true);
		setPostingError(null);
		try {
			await createJobPosting(selectedTeam.id, {
				title: postingForm.title.trim(),
				required_role: postingForm.required_role,
				role_description: postingForm.role_description.trim() || undefined,
				min_skill_level: postingForm.min_skill_level,
				is_public: postingForm.is_public,
			});
			await refreshTeams();
			setPostingOpen(false);
		} catch (err) {
			setPostingError(
				err instanceof Error ? err.message : 'Failed to create posting',
			);
		} finally {
			setPostingSubmitting(false);
		}
	};

	const submitEditPosting = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!selectedTeam || !editingPosting) return;

		setPostingSubmitting(true);
		setPostingError(null);
		try {
			await updateJobPosting(selectedTeam.id, editingPosting.id, {
				title: postingForm.title.trim() || undefined,
				role_description: postingForm.role_description.trim() || undefined,
				min_skill_level: postingForm.min_skill_level || undefined,
				is_public: postingForm.is_public,
			});
			await refreshTeams();
			setEditingPosting(null);
			setPostingForm(emptyPostingForm());
			setPostingOpen(false);
		} catch (err) {
			setPostingError(
				err instanceof Error ? err.message : 'Failed to update posting',
			);
		} finally {
			setPostingSubmitting(false);
		}
	};

	const submitTeam = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!teamForm.name.trim()) {
			setTeamError('Team name is required.');
			return;
		}

		setTeamSubmitting(true);
		setTeamError(null);
		try {
			const created = await createTeam<TeamSummary>({
				name: teamForm.name.trim(),
				development_goal: teamForm.development_goal.trim() || undefined,
				description: teamForm.description.trim() || undefined,
				visibility: teamForm.visibility,
			});

			await refreshTeams();
			setSelectedTeamId(created.id);
			setTeamForm(emptyTeamForm());
			setTeamOpen(false);
		} catch (err) {
			setTeamError(
				err instanceof Error ? err.message : 'Failed to create team',
			);
		} finally {
			setTeamSubmitting(false);
		}
	};

	const handleClosePosting = async (postingId: string) => {
		if (!selectedTeam) return;
		setClosingPostingId(postingId);
		try {
			await closeJobPosting(selectedTeam.id, postingId);
			await refreshTeams();
			setPostingError(null);
		} catch (err) {
			setPostingError(
				err instanceof Error ? err.message : 'Failed to close posting',
			);
		} finally {
			setClosingPostingId(null);
		}
	};

	const openEditPosting = (posting: any) => {
		setEditingPosting({ id: posting.id });
		setPostingForm({
			title: posting.title,
			required_role: posting.required_role,
			role_description: posting.role_description ?? '',
			min_skill_level: posting.min_skill_level,
			is_public: posting.is_public,
		});
		setPostingOpen(true);
	};

	const openMembers = () => {
		setMembersError(null);
		setMembersOpen(true);
	};

	const submitAddMember = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedTeam) return;
		setMembersSubmitting(true);
		setMembersError(null);
		try {
			await addUnregisteredMember(selectedTeam.id, {
				name: memberName.trim(),
				role: memberRole || 'Contributor',
				role_description: memberRole || undefined,
				experience_description: memberExperience.trim() || undefined,
				skill_level: memberLevel,
			});
			await refreshTeams();
			setMemberName('');
			setMemberRole('');
			setMemberExperience('');
		} catch (err) {
			setMembersError(
				err instanceof Error ? err.message : 'Failed to add member',
			);
		} finally {
			setMembersSubmitting(false);
		}
	};

	const handleRemoveMember = async (memberId: number) => {
		if (!selectedTeam) return;
		setMembersSubmitting(true);
		try {
			await removeTeamMember(selectedTeam.id, memberId);
			await refreshTeams();
		} catch (err) {
			setMembersError(
				err instanceof Error ? err.message : 'Failed to remove member',
			);
		} finally {
			setMembersSubmitting(false);
		}
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!offerTarget) return;

		const recipientId = Number(form.recipient_id);
		if (!form.team_id || !form.job_posting_id || !form.recipient_id) {
			setError('Team, job posting, and recipient ID are required.');
			return;
		}
		if (Number.isNaN(recipientId)) {
			setError('Recipient ID must be a number.');
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await sendOffer({
				team_id: form.team_id,
				recipient_id: recipientId,
				job_posting_id: form.job_posting_id,
				proposed_role: form.proposed_role.trim() || undefined,
				team_introduction: form.team_introduction.trim() || undefined,
				expected_contributions: form.expected_contributions.trim() || undefined,
				compensation_details: form.compensation_details.trim() || undefined,
			});

			setDevelopers((current) =>
				current.map((developer) =>
					developer.id === offerTarget.id
						? { ...developer, offerSent: true }
						: developer,
				),
			);
			setOfferTarget(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send offer');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
			<div className='space-y-6'>
				<section className='rounded-3xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur sm:p-5'>
					<div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
						<div className='min-w-0 flex-1'>
							<div className='flex items-center gap-2'>
								<Rocket className='h-5 w-5 text-primary' />
								<h1 className='text-2xl font-bold text-foreground'>
									{selectedTeam?.name ?? 'Team Leader Dashboard'}
								</h1>
							</div>
							<p className='mt-1 text-sm text-muted-foreground'>
								Manage your teams, postings, and offers from one place.
							</p>
						</div>

						<div className='flex w-full flex-col gap-3 sm:flex-row sm:items-end xl:w-auto'>
							<div className='w-full sm:w-64'>
								<Label className='mb-1 block text-xs font-medium text-muted-foreground'>
									Team
								</Label>
								<Select
									value={selectedTeamId}
									onValueChange={setSelectedTeamId}
								>
									<SelectTrigger className='h-10 w-full rounded-xl'>
										<SelectValue placeholder='Select a team' />
									</SelectTrigger>
									<SelectContent>
										{teams?.map((team) => (
											<SelectItem key={team.id} value={team.id}>
												{team.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<Button
								variant='outline'
								className='h-10 gap-2 rounded-xl'
								onClick={() => setTeamOpen(true)}
							>
								<FolderPlus className='h-4 w-4' />
								New Team
							</Button>
							<Button
								className='h-10 gap-2 rounded-xl'
								onClick={() => setPostingOpen(true)}
								disabled={!selectedTeam}
							>
								<Plus className='h-4 w-4' />
								Create Job Posting
							</Button>
							<Button
								variant='outline'
								className='h-10 gap-2 rounded-xl'
								onClick={openMembers}
								disabled={!selectedTeam}
							>
								<Users className='h-4 w-4' />
								Manage Members
							</Button>
						</div>
					</div>
				</section>

				<div className='grid gap-6 lg:grid-cols-10'>
					<div className='space-y-6 lg:col-span-7'>
						<section className='rounded-3xl border border-border bg-card p-5 shadow-sm'>
							<div className='flex items-center justify-between gap-4'>
								<div>
									<h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
										Selected Team
									</h2>
								</div>
								{teamsError ? (
									<p className='rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive'>
										{teamsError}
									</p>
								) : selectedTeam ? (
									<Badge
										variant={
											selectedTeam.visibility === 'PRIVATE'
												? 'secondary'
												: 'default'
										}
									>
										{selectedTeam.visibility}
									</Badge>
								) : null}
							</div>

							{teams === null ? (
								<div className='mt-4 rounded-2xl border border-dashed border-border bg-background/60 p-5 text-sm text-muted-foreground'>
									Loading teams...
								</div>
							) : selectedTeam ? (
								<div className='mt-4 rounded-2xl border border-border bg-background/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'>
									<div className='flex flex-col gap-4'>
										<div className='flex items-start justify-between gap-4'>
											<div>
												<p className='text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
													{selectedTeam.visibility}
												</p>
												<h3 className='mt-1 text-lg font-semibold text-foreground'>
													{selectedTeam.name}
												</h3>
											</div>
											<Badge variant='outline' className='rounded-full'>
												{selectedTeam.members.length} members
											</Badge>
										</div>

										{selectedTeam.development_goal ||
										selectedTeam.description ? (
											<div className='max-w-3xl space-y-2'>
												{selectedTeam.development_goal && (
													<div>
														<p className='text-xs font-medium text-muted-foreground'>
															Development Goal
														</p>
														<p className='text-sm leading-relaxed text-foreground'>
															{selectedTeam.development_goal}
														</p>
													</div>
												)}
												{selectedTeam.description && (
													<div>
														<p className='text-xs font-medium text-muted-foreground'>
															Project Description
														</p>
														<p className='text-sm leading-relaxed text-foreground'>
															{selectedTeam.description}
														</p>
													</div>
												)}
											</div>
										) : (
											<p className='max-w-3xl text-sm leading-relaxed text-muted-foreground'>
												No summary provided yet.
											</p>
										)}

										<div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
											<span className='rounded-full border border-border bg-background px-3 py-1'>
												{selectedTeam.job_postings.length} postings
											</span>
											<span className='rounded-full border border-border bg-background px-3 py-1'>
												Leader: {leaderName}
											</span>
										</div>

										{selectedTeam.members.length > 0 && (
											<div>
												<p className='text-xs font-medium text-muted-foreground'>
													Members
												</p>
												<div className='mt-2 flex flex-wrap gap-2'>
													{selectedTeam.members.map((m) => (
														<span
															key={m.id}
															className='inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs'
														>
															<span className='font-medium text-foreground'>
																{m.full_name ?? m.unregistered_name ?? `Member ${m.id}`}
															</span>
															<span className='text-muted-foreground'>
																{m.unregistered_role_description ??
																	(m.is_registered ? 'Registered' : 'Member')}
															</span>
														</span>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							) : (
								<div className='mt-4 rounded-2xl border border-dashed border-border bg-background/60 p-5 text-sm text-muted-foreground'>
									Select a team to see its overview.
								</div>
							)}
						</section>

						<section className='space-y-4'>
							<div className='flex items-center gap-2'>
								<Briefcase className='h-5 w-5 text-primary' />
								<h2 className='text-lg font-semibold text-foreground'>
									Job Postings
								</h2>
							</div>

							{postingError && (
								<p className='rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
									{postingError}
								</p>
							)}

							{!selectedTeam ? (
								<div className='rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground'>
									Select a team to view postings.
								</div>
							) : openPostings.length === 0 ? (
								<div className='rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground'>
									No open job postings yet.
								</div>
							) : (
								<div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
									{openPostings.map((posting) => (
										<Card key={posting.id} className='border-border bg-card'>
											<CardContent className='p-4'>
												<div className='flex items-start justify-between'>
													<div>
														<h3 className='font-medium text-foreground'>
															{posting.title}
														</h3>
														<p className='mt-1 text-sm text-muted-foreground'>
															{posting.required_role} ·{' '}
															{posting.min_skill_level}
														</p>
													</div>
													<Badge
														variant={
															posting.is_public ? 'secondary' : 'outline'
														}
														className='shrink-0'
													>
														{posting.is_public ? 'Public' : 'Private'}
													</Badge>
												</div>
												<div className='mt-3 grid gap-2'>
													<Link
														href={`/postings/${posting.id}`}
														className='flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
													>
														<Users className='h-4 w-4' />
														View Applications
													</Link>
													<Button
														size='sm'
														variant='outline'
														className='w-full gap-2'
														onClick={() => openEditPosting(posting)}
														disabled={closingPostingId === posting.id}
													>
														<>
															<Plus className='h-4 w-4' />
															Edit
														</>
													</Button>
													<Button
														size='sm'
														variant='outline'
														className='w-full gap-2'
														onClick={() => handleClosePosting(posting.id)}
														disabled={closingPostingId === posting.id}
													>
														{closingPostingId === posting.id ? (
															<>
																<Loader2 className='h-4 w-4 animate-spin' />
																Closing...
															</>
														) : (
															<>
																<XCircle className='h-4 w-4' />
																Close Posting
															</>
														)}
													</Button>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)}
						</section>
					</div>

					<aside className='space-y-6 lg:col-span-3'>
						<section className='rounded-3xl border border-border bg-card p-5 shadow-sm'>
							<p className='text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
								Team Analytics
							</p>
							<div className='mt-3 rounded-2xl border border-border bg-background/70 p-4'>
								<p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
									Overall Level
								</p>
								<p className='mt-1 text-2xl font-semibold text-foreground'>
									{capabilityLoading ? '...' : overallLevel}
								</p>
								<p className='mt-1 text-xs text-muted-foreground'>
									{capabilityError
										? capabilityError
										: capability
											? 'Team capability'
											: 'Loading capability'}
								</p>
								<div className='mt-4 h-2 w-full overflow-hidden rounded-full bg-muted'>
									<div
										className='h-full rounded-full bg-primary transition-all'
										style={{ width: `${capabilityPercent}%` }}
									/>
								</div>
							</div>
						</section>

						<section className='space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm'>
							<div className='flex items-center gap-2'>
								<Users className='h-5 w-5 text-primary' />
								<h2 className='text-base font-semibold text-foreground'>
									Recommended Developers
								</h2>
							</div>

							{openPostings.length > 0 && (
								<div className='w-full space-y-3'>
									<div>
										<Label className='mb-1 block text-sm font-medium text-muted-foreground'>
											Posting
										</Label>
										<Select
											value={selectedPostingId}
											onValueChange={setSelectedPostingId}
										>
											<SelectTrigger className='w-full'>
												<SelectValue placeholder='Select a posting' />
											</SelectTrigger>
											<SelectContent>
												{openPostings.map((posting) => (
													<SelectItem key={posting.id} value={posting.id}>
														{posting.title}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className='grid grid-cols-2 gap-2'>
										<div>
											<Label className='mb-1 block text-xs text-muted-foreground'>
												Min Level
											</Label>
											<Select
												value={filterLevel}
												onValueChange={setFilterLevel}
											>
												<SelectTrigger className='w-full'>
													<SelectValue placeholder='Any' />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='any'>Any</SelectItem>
													{skillOptions.map((s) => (
														<SelectItem key={s} value={s}>
															{s}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div>
											<Label className='mb-1 block text-xs text-muted-foreground'>
												Skill Tag
											</Label>
											<Input
												placeholder='e.g. React'
												value={filterTag}
												onChange={(e) => setFilterTag(e.target.value)}
												className='h-9'
											/>
										</div>
									</div>
								</div>
							)}

							<div className='space-y-3'>
								{developersLoading ? (
									<div className='rounded-2xl border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground'>
										Loading recommendations...
									</div>
								) : developersError ? (
									<div className='rounded-2xl border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground'>
										{developersError}
									</div>
								) : developers.length === 0 ? (
									<div className='rounded-2xl border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground'>
										Select a team and posting to view recommended developers.
									</div>
								) : (
									developers.map((developer) => (
										<Card
											key={developer.id}
											className='border-border bg-card transition-all hover:border-primary/30 hover:shadow-sm'
										>
											<CardContent className='p-4'>
												<div className='flex items-start gap-3'>
													<Avatar className='h-11 w-11 shrink-0'>
														<AvatarImage
															src={developer.avatar}
															alt={developer.name}
														/>
														<AvatarFallback className='bg-primary text-primary-foreground'>
															{developer.name
																.split(' ')
																.map((part) => part[0])
																.join('')}
														</AvatarFallback>
													</Avatar>
													<div className='min-w-0 flex-1'>
														<div className='flex items-start justify-between gap-2'>
															<div className='min-w-0'>
																<h3 className='truncate text-sm font-semibold text-foreground'>
																	{developer.name}
																</h3>
																<p className='truncate text-xs text-muted-foreground'>
																	{developer.role}
																</p>
															</div>
															<Badge
																className={cn(
																	'shrink-0',
																	levelStyles[developer.skillLevel],
																)}
															>
																{developer.skillLevel}
															</Badge>
														</div>
														<div className='mt-2 flex flex-wrap gap-1.5'>
															{developer.topSkills.map((skill) => (
																<span
																	key={skill}
																	className='rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
																>
																	{skill}
																</span>
															))}
														</div>
														<div className='mt-3'>
															<Button
																onClick={() => openOffer(developer)}
																disabled={
																	developer.offerSent ||
																	developer.userId === null
																}
																variant={
																	developer.offerSent ? 'outline' : 'default'
																}
																className='w-full justify-center gap-2'
																size='sm'
															>
																{developer.offerSent ? (
																	<>
																		<CheckCircle2 className='h-4 w-4' />
																		Offer Sent
																	</>
																) : developer.userId === null ? (
																	'No user id available'
																) : (
																	<>
																		<Send className='h-4 w-4' />
																		Send Offer
																	</>
																)}
															</Button>
														</div>
													</div>
												</div>
											</CardContent>
										</Card>
									))
								)}
							</div>
						</section>
					</aside>
				</div>
			</div>

			<Dialog
				open={!!offerTarget}
				onOpenChange={(open) => {
					if (!open) closeOffer();
				}}
			>
				<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>Send offer to {offerTarget?.name}</DialogTitle>
						<DialogDescription>
							Fill in the offer details below. The developer will receive this
							in their inbox.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} className='space-y-4'>
						{teamsError && (
							<p className='rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
								{teamsError}
							</p>
						)}

						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='space-y-1.5'>
								<Label htmlFor='team_id'>Team</Label>
								<Select
									value={form.team_id}
									onValueChange={handleTeamChange}
									disabled={!teams || teams.length === 0}
								>
									<SelectTrigger id='team_id' className='w-full'>
										<SelectValue
											placeholder={
												teams === null
													? 'Loading teams...'
													: teams.length === 0
														? 'No teams found'
														: 'Select a team'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{teams?.map((team) => (
											<SelectItem key={team.id} value={team.id}>
												{team.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='job_posting_id'>Job Posting</Label>
								<Select
									value={form.job_posting_id}
									onValueChange={(value) =>
										updateField('job_posting_id', value)
									}
									disabled={!selectedTeam || openPostings.length === 0}
								>
									<SelectTrigger id='job_posting_id' className='w-full'>
										<SelectValue
											placeholder={
												!selectedTeam
													? 'Select a team first'
													: openPostings.length === 0
														? 'No open postings'
														: 'Select a posting'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{openPostings.map((posting) => (
											<SelectItem key={posting.id} value={posting.id}>
												{posting.title} — {posting.required_role}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='space-y-1.5'>
								<Label htmlFor='recipient_id'>Recipient User ID</Label>
								<Input
									id='recipient_id'
									type='number'
									value={form.recipient_id}
									onChange={(event) =>
										updateField('recipient_id', event.target.value)
									}
									required
								/>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='proposed_role'>Proposed Role</Label>
								<Input
									id='proposed_role'
									placeholder='e.g. Frontend Engineer'
									value={form.proposed_role}
									onChange={(event) =>
										updateField('proposed_role', event.target.value)
									}
								/>
							</div>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='team_introduction'>Team Introduction</Label>
							<Textarea
								id='team_introduction'
								placeholder='Briefly introduce your team and project'
								rows={3}
								value={form.team_introduction}
								onChange={(event) =>
									updateField('team_introduction', event.target.value)
								}
							/>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='expected_contributions'>
								Expected Contributions
							</Label>
							<Textarea
								id='expected_contributions'
								placeholder='What will this developer work on?'
								rows={3}
								value={form.expected_contributions}
								onChange={(event) =>
									updateField('expected_contributions', event.target.value)
								}
							/>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='compensation_details'>Compensation Details</Label>
							<Textarea
								id='compensation_details'
								placeholder='Optional'
								rows={2}
								value={form.compensation_details}
								onChange={(event) =>
									updateField('compensation_details', event.target.value)
								}
							/>
						</div>

						{error && <p className='text-sm text-destructive'>{error}</p>}

						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								onClick={closeOffer}
								disabled={submitting}
							>
								Cancel
							</Button>
							<Button type='submit' disabled={submitting} className='gap-2'>
								{submitting ? (
									<>
										<Loader2 className='h-4 w-4 animate-spin' />
										Sending...
									</>
								) : (
									<>
										<Send className='h-4 w-4' />
										Send Offer
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<Dialog
				open={membersOpen}
				onOpenChange={(open) => {
					if (!open) setMembersOpen(open);
				}}
			>
				<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>Manage Members</DialogTitle>
						<DialogDescription>
							Add or remove unregistered (external) team members.
						</DialogDescription>
					</DialogHeader>

					<div className='space-y-4'>
						<div>
							<h3 className='text-sm font-medium text-muted-foreground'>
								Current members
							</h3>
							<div className='mt-2 space-y-2'>
								{selectedTeam?.members.length ? (
									selectedTeam.members.map((m) => (
										<div
											key={m.id}
											className='flex items-center justify-between gap-2 rounded-lg border border-border p-2'
										>
											<div>
												<div className='text-sm font-medium'>
													{m.full_name ?? m.unregistered_name ?? `Member ${m.id}`}
												</div>
												<div className='text-xs text-muted-foreground'>
													{m.unregistered_role_description ??
														(m.is_registered ? 'Registered' : 'Unregistered')}
												</div>
											</div>
											{!m.is_registered && (
												<div>
													<Button
														size='sm'
														variant='destructive'
														onClick={() => {
															// simple confirmation to avoid accidental deletes
															// eslint-disable-next-line no-restricted-globals
															if (confirm('Remove this unregistered member?'))
																handleRemoveMember(m.id);
														}}
														disabled={membersSubmitting}
													>
														Remove
													</Button>
												</div>
											)}
										</div>
									))
								) : (
									<div className='rounded-2xl border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground'>
										No members
									</div>
								)}
							</div>
						</div>

						<form onSubmit={submitAddMember} className='space-y-3'>
							<div className='space-y-1.5'>
								<Label>Full name</Label>
								<Input
									value={memberName}
									onChange={(e) => setMemberName(e.target.value)}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Role</Label>
								<Input
									value={memberRole}
									onChange={(e) => setMemberRole(e.target.value)}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Experience description</Label>
								<Textarea
									placeholder='Brief description of their experience'
									rows={3}
									value={memberExperience}
									onChange={(e) => setMemberExperience(e.target.value)}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label>Skill level</Label>
								<Select
									value={memberLevel}
									onValueChange={(v) => setMemberLevel(v)}
								>
									<SelectTrigger className='w-full'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{skillOptions.map((s) => (
											<SelectItem key={s} value={s}>
												{s}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{membersError && (
								<p className='text-sm text-destructive'>{membersError}</p>
							)}
							<div className='flex justify-end gap-2'>
								<Button
									variant='outline'
									onClick={() => setMembersOpen(false)}
									disabled={membersSubmitting}
								>
									Close
								</Button>
								<Button type='submit' disabled={membersSubmitting}>
									{membersSubmitting ? 'Adding...' : 'Add member'}
								</Button>
							</div>
						</form>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={postingOpen}
				onOpenChange={(open) => {
					if (!open) {
						setPostingOpen(open);
						setEditingPosting(null);
					}
				}}
			>
				<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>
							{editingPosting ? 'Edit job posting' : 'Create job posting'}
						</DialogTitle>
						<DialogDescription>
							{editingPosting
								? 'Edit the posting details. Changes will refresh recommendations.'
								: 'Add a real opening for the selected team so candidates can be recommended and contacted.'}
						</DialogDescription>
					</DialogHeader>

					<form
						onSubmit={editingPosting ? submitEditPosting : submitPosting}
						className='space-y-4'
					>
						<div className='space-y-1.5'>
							<Label htmlFor='posting_title'>Title</Label>
							<Input
								id='posting_title'
								placeholder='e.g. Frontend Developer'
								value={postingForm.title}
								onChange={(event) =>
									setPostingForm((state) => ({
										...state,
										title: event.target.value,
									}))
								}
							/>
						</div>

						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='space-y-1.5'>
								<Label htmlFor='required_role'>Required Role</Label>
								<Select
									value={postingForm.required_role}
									onValueChange={(value) =>
										setPostingForm((state) => ({
											...state,
											required_role: value,
										}))
									}
								>
									<SelectTrigger id='required_role' className='w-full'>
										<SelectValue placeholder='Select a role' />
									</SelectTrigger>
									<SelectContent>
										{roleOptions.map((role) => (
											<SelectItem key={role} value={role}>
												{role}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='min_skill_level'>Minimum Skill Level</Label>
								<Select
									value={postingForm.min_skill_level}
									onValueChange={(value) =>
										setPostingForm((state) => ({
											...state,
											min_skill_level: value,
										}))
									}
								>
									<SelectTrigger id='min_skill_level' className='w-full'>
										<SelectValue placeholder='Select a level' />
									</SelectTrigger>
									<SelectContent>
										{skillOptions.map((level) => (
											<SelectItem key={level} value={level}>
												{level}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='role_description'>Role Description</Label>
							<Textarea
								id='role_description'
								placeholder='Describe the work, stack, and expectations'
								rows={4}
								value={postingForm.role_description}
								onChange={(event) =>
									setPostingForm((state) => ({
										...state,
										role_description: event.target.value,
									}))
								}
							/>
						</div>

						<div className='flex items-center gap-3'>
							<input
								id='is_public'
								type='checkbox'
								checked={postingForm.is_public}
								onChange={(event) =>
									setPostingForm((state) => ({
										...state,
										is_public: event.target.checked,
									}))
								}
								className='h-4 w-4 rounded border-border'
							/>
							<Label htmlFor='is_public' className='text-sm font-normal'>
								Make this posting visible to candidate discovery
							</Label>
						</div>

						{postingError && (
							<p className='text-sm text-destructive'>{postingError}</p>
						)}

						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								onClick={() => setPostingOpen(false)}
								disabled={postingSubmitting}
							>
								Cancel
							</Button>
							<Button
								type='submit'
								disabled={postingSubmitting}
								className='gap-2'
							>
								{postingSubmitting ? (
									<>
										<Loader2 className='h-4 w-4 animate-spin' />
										Creating...
									</>
								) : (
									<>
										<Plus className='h-4 w-4' />
										Create Posting
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={teamOpen} onOpenChange={(open) => setTeamOpen(open)}>
				<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>Create team</DialogTitle>
						<DialogDescription>
							Set up a new team before adding job postings and sending offers.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={submitTeam} className='space-y-4'>
						<div className='space-y-1.5'>
							<Label htmlFor='team_name'>Team Name</Label>
							<Input
								id='team_name'
								placeholder='e.g. crawlers'
								value={teamForm.name}
								onChange={(event) =>
									setTeamForm((state) => ({
										...state,
										name: event.target.value,
									}))
								}
							/>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='team_goal'>Development Goal</Label>
							<Input
								id='team_goal'
								placeholder='What is this team building?'
								value={teamForm.development_goal}
								onChange={(event) =>
									setTeamForm((state) => ({
										...state,
										development_goal: event.target.value,
									}))
								}
							/>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='team_description'>Description</Label>
							<Textarea
								id='team_description'
								placeholder='Short summary for team discovery'
								rows={4}
								value={teamForm.description}
								onChange={(event) =>
									setTeamForm((state) => ({
										...state,
										description: event.target.value,
									}))
								}
							/>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='team_visibility'>Visibility</Label>
							<Select
								value={teamForm.visibility}
								onValueChange={(value: 'PUBLIC' | 'PRIVATE') =>
									setTeamForm((state) => ({ ...state, visibility: value }))
								}
							>
								<SelectTrigger id='team_visibility' className='w-full'>
									<SelectValue placeholder='Select visibility' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='PUBLIC'>PUBLIC</SelectItem>
									<SelectItem value='PRIVATE'>PRIVATE</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{teamError && (
							<p className='text-sm text-destructive'>{teamError}</p>
						)}

						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								onClick={() => setTeamOpen(false)}
								disabled={teamSubmitting}
							>
								Cancel
							</Button>
							<Button type='submit' disabled={teamSubmitting} className='gap-2'>
								{teamSubmitting ? (
									<>
										<Loader2 className='h-4 w-4 animate-spin' />
										Creating...
									</>
								) : (
									<>
										<Plus className='h-4 w-4' />
										Create Team
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</main>
	);
}

// ---------------------------------------------------------------------------
// Developer dashboard (FR-58 – FR-62)
// In a team  -> read-only team overview (what a leader would see).
// No team    -> list of the developer's applications and their statuses.
// ---------------------------------------------------------------------------

const applicationStatusStyles: Record<string, string> = {
	pending: 'bg-amber-100 text-amber-700',
	reviewing: 'bg-blue-100 text-blue-700',
	accepted: 'bg-green-100 text-green-700',
	declined: 'bg-red-100 text-red-700',
	cancelled: 'bg-muted text-muted-foreground',
	withdrawn: 'bg-muted text-muted-foreground',
	closed: 'bg-muted text-muted-foreground',
};

function formatDate(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function DeveloperApplicationsView() {
	const [applications, setApplications] = useState<
		DeveloperApplicationOut[] | null
	>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		getMyApplications<DeveloperApplicationOut[]>()
			.then((data) => {
				if (!cancelled) setApplications(data);
			})
			.catch(() => {
				if (!cancelled) setError('Could not load your applications.');
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<section className='rounded-3xl border border-border bg-card p-5 shadow-sm'>
			<div className='flex items-center gap-2'>
				<ClipboardList className='h-5 w-5 text-primary' />
				<h2 className='text-lg font-semibold text-foreground'>
					My Applications
				</h2>
			</div>
			<p className='mt-1 text-sm text-muted-foreground'>
				Track the status of the job postings you have applied to.
			</p>

			<div className='mt-4 space-y-3'>
				{error ? (
					<div className='rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground'>
						{error}
					</div>
				) : applications === null ? (
					<div className='rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground'>
						Loading your applications...
					</div>
				) : applications.length === 0 ? (
					<div className='rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground'>
						<p>You haven&apos;t applied to any job postings yet.</p>
						<Link
							href='/search'
							className='mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted'
						>
							<Search className='h-4 w-4' />
							Browse open positions
						</Link>
					</div>
				) : (
					applications.map((application) => (
						<Card key={application.id} className='border-border bg-card'>
							<CardContent className='flex items-center justify-between gap-4 p-4'>
								<div className='min-w-0'>
									<p className='truncate text-sm font-medium text-foreground'>
										Application #{application.id}
									</p>
									<p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
										<Clock className='h-3.5 w-3.5' />
										Applied {formatDate(application.created_at)}
									</p>
								</div>
								<Badge
									className={cn(
										'shrink-0 capitalize',
										applicationStatusStyles[application.status] ??
											'bg-muted text-muted-foreground',
									)}
								>
									{application.status}
								</Badge>
							</CardContent>
						</Card>
					))
				)}
			</div>
		</section>
	);
}

function DeveloperTeamCard({ team }: { team: TeamSummary }) {
	const [capability, setCapability] = useState<TeamCapabilityRead | null>(null);

	useEffect(() => {
		let cancelled = false;
		getTeamCapability(team.id)
			.then((data) => {
				if (!cancelled) setCapability(data);
			})
			.catch(() => {
				if (!cancelled) setCapability(null);
			});
		return () => {
			cancelled = true;
		};
	}, [team.id]);

	const overallLevel = capability?.overall_label ?? 'N/A';
	const capabilityPercent =
		overallLevel === 'Beginner'
			? 25
			: overallLevel === 'Intermediate'
				? 50
				: overallLevel === 'Advanced'
					? 75
					: overallLevel === 'Expert'
						? 100
						: 0;

	const openPostings = team.job_postings.filter(
		(posting) => posting.status === 'OPEN',
	);

	return (
		<section className='rounded-3xl border border-border bg-card p-5 shadow-sm'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<p className='text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
						{team.visibility}
					</p>
					<h2 className='mt-1 text-xl font-semibold text-foreground'>
						{team.name}
					</h2>
				</div>
				<Badge variant='outline' className='rounded-full'>
					{team.members.length} members
				</Badge>
			</div>

			{team.development_goal || team.description ? (
				<div className='mt-4 max-w-3xl space-y-2'>
					{team.development_goal && (
						<div>
							<p className='text-xs font-medium text-muted-foreground'>
								Development Goal
							</p>
							<p className='text-sm leading-relaxed text-foreground'>
								{team.development_goal}
							</p>
						</div>
					)}
					{team.description && (
						<div>
							<p className='text-xs font-medium text-muted-foreground'>
								Project Description
							</p>
							<p className='text-sm leading-relaxed text-foreground'>
								{team.description}
							</p>
						</div>
					)}
				</div>
			) : (
				<p className='mt-4 text-sm text-muted-foreground'>
					No summary provided yet.
				</p>
			)}

			<div className='mt-4 rounded-2xl border border-border bg-background/70 p-4'>
				<p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
					Team Capability
				</p>
				<p className='mt-1 text-2xl font-semibold text-foreground'>
					{overallLevel}
				</p>
				<div className='mt-3 h-2 w-full overflow-hidden rounded-full bg-muted'>
					<div
						className='h-full rounded-full bg-primary transition-all'
						style={{ width: `${capabilityPercent}%` }}
					/>
				</div>
			</div>

			{team.members.length > 0 && (
				<div className='mt-4'>
					<p className='text-xs font-medium text-muted-foreground'>Members</p>
					<div className='mt-2 flex flex-wrap gap-2'>
						{team.members.map((m) => (
							<span
								key={m.id}
								className='inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs'
							>
								<span className='font-medium text-foreground'>
									{m.full_name ?? m.unregistered_name ?? `Member ${m.id}`}
								</span>
								<span className='text-muted-foreground'>
									{m.unregistered_role_description ??
										(m.is_registered ? 'Registered' : 'Member')}
								</span>
							</span>
						))}
					</div>
				</div>
			)}

			<div className='mt-4'>
				<div className='flex items-center gap-2'>
					<Briefcase className='h-4 w-4 text-primary' />
					<p className='text-sm font-semibold text-foreground'>
						Open Job Postings
					</p>
				</div>
				{openPostings.length === 0 ? (
					<p className='mt-2 text-sm text-muted-foreground'>
						No open job postings.
					</p>
				) : (
					<div className='mt-2 grid gap-3 sm:grid-cols-2'>
						{openPostings.map((posting) => (
							<Card key={posting.id} className='border-border bg-card'>
								<CardContent className='p-4'>
									<h3 className='font-medium text-foreground'>
										{posting.title}
									</h3>
									<p className='mt-1 text-sm text-muted-foreground'>
										{posting.required_role} · {posting.min_skill_level}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

function DeveloperDashboard() {
	const [teams, setTeams] = useState<TeamSummary[] | null>(null);

	useEffect(() => {
		let cancelled = false;
		listMyTeams()
			.then((data) => {
				if (!cancelled) setTeams(data);
			})
			.catch(() => {
				if (!cancelled) setTeams([]);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const inTeam = (teams?.length ?? 0) > 0;

	return (
		<main className='mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8'>
			<div className='space-y-6'>
				<section className='rounded-3xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur sm:p-5'>
					<div className='flex items-center gap-2'>
						<Rocket className='h-5 w-5 text-primary' />
						<h1 className='text-2xl font-bold text-foreground'>
							Developer Dashboard
						</h1>
					</div>
					<p className='mt-1 text-sm text-muted-foreground'>
						{teams === null
							? 'Loading your workspace...'
							: inTeam
								? 'Here is the team you are part of and what it is building.'
								: 'Track your applications and find new opportunities.'}
					</p>
				</section>

				{teams === null ? (
					<div className='flex justify-center py-12'>
						<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
					</div>
				) : inTeam ? (
					<div className='space-y-6'>
						{teams!.map((team) => (
							<DeveloperTeamCard key={team.id} team={team} />
						))}
					</div>
				) : (
					<DeveloperApplicationsView />
				)}
			</div>
		</main>
	);
}

export default function DashboardPage() {
	const [role, setRole] = useState<string | null | undefined>(undefined);

	useEffect(() => {
		let cancelled = false;
		getCurrentUser<CurrentUser>()
			.then((u) => {
				if (!cancelled) setRole(u.role ?? null);
			})
			.catch(() => {
				if (!cancelled) setRole(null);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (role === undefined) {
		return (
			<div className='flex min-h-[60vh] items-center justify-center'>
				<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
			</div>
		);
	}

	if (role === 'TEAM_LEADER' || role === 'ADMIN') {
		return <LeaderDashboard />;
	}

	return <DeveloperDashboard />;
}
