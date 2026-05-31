'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import {
	getAllDevelopers,
	getCurrentUser,
	listMyTeams,
	sendOffer,
	type DeveloperListItem,
	type TeamSummary,
} from '@/lib/api';

interface CurrentUser {
	id: number;
}

interface OfferForm {
	team_id: string;
	job_posting_id: string;
	proposed_role: string;
	team_introduction: string;
	expected_contributions: string;
	compensation_details: string;
}

function initials(name: string | null) {
	if (!name) return '?';
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

export function DeveloperOfferSearch({
	query,
	canOffer = true,
}: {
	query: string;
	canOffer?: boolean;
}) {
	const [currentUserId, setCurrentUserId] = useState<number | null>(null);
	const [teams, setTeams] = useState<TeamSummary[]>([]);
	const [developers, setDevelopers] = useState<DeveloperListItem[] | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);

	const [offerTarget, setOfferTarget] = useState<DeveloperListItem | null>(
		null,
	);
	const [form, setForm] = useState<OfferForm>({
		team_id: '',
		job_posting_id: '',
		proposed_role: '',
		team_introduction: '',
		expected_contributions: '',
		compensation_details: '',
	});
	const [submitting, setSubmitting] = useState(false);
	const [offerError, setOfferError] = useState<string | null>(null);
	const [sentUserIds, setSentUserIds] = useState<Set<number>>(new Set());

	useEffect(() => {
		let cancelled = false;
		Promise.all([
			getCurrentUser<CurrentUser>(),
			listMyTeams(),
			getAllDevelopers(),
		])
			.then(([user, myTeams, devs]) => {
				if (cancelled) return;
				setCurrentUserId(user.id);
				setTeams(myTeams);
				setDevelopers(devs);
			})
			.catch(() => {
				if (cancelled) return;
				setDevelopers([]);
				setError('Could not load developers.');
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const ledTeams = useMemo(
		() =>
			teams.filter(
				(team) => currentUserId !== null && team.leader_id === currentUserId,
			),
		[teams, currentUserId],
	);

	const filtered = useMemo(() => {
		const list = developers ?? [];
		const q = query.trim().toLowerCase();
		if (!q) return list;
		return list.filter((dev) =>
			[dev.full_name ?? '', ...dev.roles.map((r) => r.name), ...dev.skills]
				.join(' ')
				.toLowerCase()
				.includes(q),
		);
	}, [developers, query]);

	const offerTeam = ledTeams.find((team) => team.id === form.team_id) ?? null;
	const offerPostings =
		offerTeam?.job_postings.filter((posting) => posting.status === 'OPEN') ??
		[];

	const openOffer = (dev: DeveloperListItem) => {
		const firstTeam = ledTeams[0];
		const firstPosting = firstTeam?.job_postings.find(
			(p) => p.status === 'OPEN',
		);
		setForm({
			team_id: firstTeam?.id ?? '',
			job_posting_id: firstPosting?.id ?? '',
			proposed_role: dev.roles[0]?.name ?? '',
			team_introduction: '',
			expected_contributions: '',
			compensation_details: '',
		});
		setOfferError(null);
		setOfferTarget(dev);
	};

	const changeTeam = (teamId: string) => {
		const team = ledTeams.find((t) => t.id === teamId);
		const firstPosting = team?.job_postings.find((p) => p.status === 'OPEN');
		setForm((s) => ({
			...s,
			team_id: teamId,
			job_posting_id: firstPosting?.id ?? '',
		}));
	};

	const submitOffer = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!offerTarget || offerTarget.user_id == null) return;
		if (!form.team_id || !form.job_posting_id) {
			setOfferError('Select a team and an open job posting.');
			return;
		}
		setSubmitting(true);
		setOfferError(null);
		try {
			await sendOffer({
				team_id: form.team_id,
				recipient_id: offerTarget.user_id,
				job_posting_id: form.job_posting_id,
				proposed_role: form.proposed_role.trim() || undefined,
				team_introduction: form.team_introduction.trim() || undefined,
				expected_contributions: form.expected_contributions.trim() || undefined,
				compensation_details: form.compensation_details.trim() || undefined,
			});
			setSentUserIds((prev) =>
				new Set(prev).add(offerTarget.user_id as number),
			);
			setOfferTarget(null);
		} catch (err) {
			setOfferError(
				err instanceof Error ? err.message : 'Failed to send offer',
			);
		} finally {
			setSubmitting(false);
		}
	};

	if (developers === null) {
		return (
			<div className='flex justify-center py-12'>
				<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			{error && (
				<Card className='border-border bg-card'>
					<CardContent className='p-4 text-sm text-muted-foreground'>
						{error}
					</CardContent>
				</Card>
			)}

			{canOffer && ledTeams.length === 0 && (
				<Card className='border-border bg-card'>
					<CardContent className='p-4 text-sm text-muted-foreground'>
						Create a team with an open job posting from your dashboard to be
						able to send offers.
					</CardContent>
				</Card>
			)}

			{filtered.length === 0 ? (
				<Card className='border-border bg-card'>
					<CardContent className='p-6 text-sm text-muted-foreground'>
						No developers match your search.
					</CardContent>
				</Card>
			) : (
				<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
					{filtered.map((dev) => {
						const alreadySent =
							dev.already_offered ||
							(dev.user_id != null && sentUserIds.has(dev.user_id));
						return (
							<Card
								key={dev.profile_id}
								className='border-border bg-card transition-all hover:border-primary/30 hover:shadow-md'
							>
								<CardContent className='space-y-4 p-6'>
									{/* The person area links to their profile */}
									<Link
										href={`/developers/${dev.profile_id}`}
										className='block space-y-4 rounded-lg outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring'
									>
										<div className='flex items-start gap-4'>
											<Avatar className='h-12 w-12'>
												<AvatarFallback className='bg-primary text-primary-foreground'>
													{initials(dev.full_name)}
												</AvatarFallback>
											</Avatar>
											<div className='min-w-0 flex-1'>
												<h3 className='font-semibold text-foreground hover:underline'>
													{dev.full_name ?? 'Anonymous developer'}
												</h3>
												{dev.roles[0] && (
													<p className='mt-1 text-sm text-muted-foreground'>
														{dev.roles[0].name}
													</p>
												)}
											</div>
										</div>

										{dev.roles.length > 0 && (
											<div className='flex flex-wrap gap-1.5'>
												{dev.roles.map((role) => (
													<span
														key={role.name}
														className='rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'
													>
														{role.name}
													</span>
												))}
											</div>
										)}

										{dev.skills.length > 0 && (
											<div className='flex flex-wrap gap-1.5'>
												{dev.skills.map((skill) => (
													<span
														key={skill}
														className='rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
													>
														{skill}
													</span>
												))}
											</div>
										)}
									</Link>

									{canOffer && (
										<Button
											className='w-full justify-center gap-2'
											size='sm'
											variant={alreadySent ? 'outline' : 'default'}
											disabled={
												alreadySent ||
												dev.user_id == null ||
												ledTeams.length === 0
											}
											onClick={() => openOffer(dev)}
										>
											{alreadySent ? (
												<>
													<CheckCircle2 className='h-4 w-4' />
													Offer Sent
												</>
											) : dev.user_id == null ? (
												'No user id available'
											) : (
												<>
													<Send className='h-4 w-4' />
													Send Offer
												</>
											)}
										</Button>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			<Dialog
				open={!!offerTarget}
				onOpenChange={(open) => {
					if (!open && !submitting) setOfferTarget(null);
				}}
			>
				<DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
					<DialogHeader>
						<DialogTitle>
							Send offer to {offerTarget?.full_name ?? 'developer'}
						</DialogTitle>
						<DialogDescription>
							The developer will receive this offer in their inbox.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={submitOffer} className='space-y-4'>
						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='space-y-1.5'>
								<Label htmlFor='offer_team'>Team</Label>
								<Select value={form.team_id} onValueChange={changeTeam}>
									<SelectTrigger id='offer_team' className='w-full'>
										<SelectValue
											placeholder={
												ledTeams.length === 0 ? 'No teams' : 'Select a team'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{ledTeams.map((team) => (
											<SelectItem key={team.id} value={team.id}>
												{team.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='offer_posting'>Job posting</Label>
								<Select
									value={form.job_posting_id}
									onValueChange={(value) =>
										setForm((s) => ({ ...s, job_posting_id: value }))
									}
									disabled={offerPostings.length === 0}
								>
									<SelectTrigger id='offer_posting' className='w-full'>
										<SelectValue
											placeholder={
												offerPostings.length === 0
													? 'No open postings'
													: 'Select a posting'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{offerPostings.map((posting) => (
											<SelectItem key={posting.id} value={posting.id}>
												{posting.title}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='proposed_role'>Proposed Role</Label>
							<Textarea
								id='proposed_role'
								rows={1}
								placeholder='e.g. Frontend Engineer'
								value={form.proposed_role}
								onChange={(e) =>
									setForm((s) => ({ ...s, proposed_role: e.target.value }))
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label htmlFor='team_introduction'>Team Introduction</Label>
							<Textarea
								id='team_introduction'
								rows={3}
								placeholder='Briefly introduce your team and project'
								value={form.team_introduction}
								onChange={(e) =>
									setForm((s) => ({ ...s, team_introduction: e.target.value }))
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label htmlFor='expected_contributions'>
								Expected Contributions
							</Label>
							<Textarea
								id='expected_contributions'
								rows={3}
								placeholder='What will this developer work on?'
								value={form.expected_contributions}
								onChange={(e) =>
									setForm((s) => ({
										...s,
										expected_contributions: e.target.value,
									}))
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label htmlFor='compensation_details'>Compensation Details</Label>
							<Textarea
								id='compensation_details'
								rows={2}
								placeholder='Optional'
								value={form.compensation_details}
								onChange={(e) =>
									setForm((s) => ({
										...s,
										compensation_details: e.target.value,
									}))
								}
							/>
						</div>

						{offerError && (
							<p className='text-sm text-destructive'>{offerError}</p>
						)}

						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								onClick={() => setOfferTarget(null)}
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
		</div>
	);
}
