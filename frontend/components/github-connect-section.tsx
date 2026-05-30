"use client";

import { GitHubLink } from "@/components/github-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOAuthProviderStatus } from "@/lib/api";
import type { ExternalURLRead } from "@/lib/profile-types";
import { extractGitHubUsername } from "@/lib/profile-types";
import {
	AlertTriangle,
	CheckCircle2,
	GitBranch,
	GitFork,
	Loader2,
	Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface GitHubConnectSectionProps {
	link: ExternalURLRead | null;
	editMode?: boolean;
	onConnectOAuth: () => Promise<void> | void;
	onSaveManual: (url: string) => Promise<void> | void;
	onDisconnect: () => Promise<void> | void;
}

function ParseStatusBadge({ status }: { status: string }) {
	if (status === "SUCCESS") {
		return (
			<Badge variant="secondary" className="gap-1 text-xs">
				<CheckCircle2 className="h-3 w-3" />
				Synced
			</Badge>
		);
	}
	if (status === "PENDING") {
		return (
			<Badge variant="secondary" className="gap-1 text-xs">
				<Loader2 className="h-3 w-3 animate-spin" />
				Syncing...
			</Badge>
		);
	}
	return (
		<Badge variant="destructive" className="gap-1 text-xs">
			<AlertTriangle className="h-3 w-3" />
			Failed
		</Badge>
	);
}

function GitHubDataPanel({ link }: { link: ExternalURLRead }) {
	if (link.parse_status === "PENDING") {
		return (
			<div className="rounded-xl border border-border bg-background/50 p-4">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					<span>Syncing GitHub data...</span>
				</div>
			</div>
		);
	}

	if (link.parse_status === "FAILED") {
		return (
			<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
				<div className="flex items-center gap-2 text-sm text-destructive">
					<AlertTriangle className="h-4 w-4" />
					<span>
						{link.parse_message || "Failed to sync GitHub data."}
					</span>
				</div>
			</div>
		);
	}

	const repos = link.parsed_repo_list ?? [];
	const commitCount = link.parsed_commit_count ?? 0;

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="rounded-xl border border-border bg-background/50 p-4">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<GitBranch className="h-4 w-4" />
						<span>Commits (12 months)</span>
					</div>
					<p className="mt-1 text-2xl font-semibold text-foreground">
						{commitCount.toLocaleString()}
					</p>
				</div>
				<div className="rounded-xl border border-border bg-background/50 p-4">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<GitFork className="h-4 w-4" />
						<span>Public Repositories</span>
					</div>
					<p className="mt-1 text-2xl font-semibold text-foreground">
						{repos.length}
					</p>
				</div>
			</div>

			{repos.length > 0 && (
				<div className="space-y-2">
					<p className="text-sm font-medium text-muted-foreground">
						Top Repositories
					</p>
					<div className="max-h-64 space-y-2 overflow-y-auto">
						{repos.map((repo) => (
							<a
								key={repo.html_url}
								href={repo.html_url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 transition-colors hover:bg-accent"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-foreground">
										{repo.name}
									</p>
									{repo.description && (
										<p className="mt-0.5 truncate text-xs text-muted-foreground">
											{repo.description}
										</p>
									)}
								</div>
								<div className="ml-4 flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
									{repo.top_language && (
										<span className="rounded-full bg-muted px-2 py-0.5">
											{repo.top_language}
										</span>
									)}
									{repo.stargazers_count > 0 && (
										<span className="flex items-center gap-1">
											<Star className="h-3 w-3" />
											{repo.stargazers_count}
										</span>
									)}
									{repo.forks_count > 0 && (
										<span className="flex items-center gap-1">
											<GitFork className="h-3 w-3" />
											{repo.forks_count}
										</span>
									)}
								</div>
							</a>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export function GitHubConnectSection({
	link,
	editMode,
	onConnectOAuth,
	onSaveManual,
	onDisconnect,
}: GitHubConnectSectionProps) {
	const [draftUrl, setDraftUrl] = useState(link?.url_str ?? "");
	const [error, setError] = useState<string | null>(null);
	const [oauthAvailable, setOauthAvailable] = useState<boolean | null>(null);

	const username = useMemo(
		() => extractGitHubUsername(link?.url_str),
		[link?.url_str],
	);

	useEffect(() => {
		setDraftUrl(link?.url_str ?? "");
		setError(null);
	}, [link?.id, link?.url_str, editMode]);

	useEffect(() => {
		let isActive = true;

		const loadStatus = async () => {
			try {
				const status = await getOAuthProviderStatus<{
					provider: string;
					configured: boolean;
				}>("github");

				if (isActive) {
					setOauthAvailable(status.configured);
				}
			} catch {
				if (isActive) {
					setOauthAvailable(false);
				}
			}
		};

		loadStatus();

		return () => {
			isActive = false;
		};
	}, []);

	const handleManualSave = async () => {
		const nextUrl = draftUrl.trim();
		if (!nextUrl) {
			setError("Enter a GitHub URL.");
			return;
		}

		setError(null);
		await onSaveManual(nextUrl);
	};

	const viewCard = username ? (
		<GitHubLink username={username} />
	) : (
		<section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:justify-between">
			<div className="text-center sm:text-left">
				<h3 className="font-semibold text-foreground">Connect on GitHub</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Check out more of my work and contributions
				</p>
			</div>
			<div className="flex flex-col items-center gap-2 sm:items-end">
				<Button
					className="gap-2"
					onClick={onConnectOAuth}
					disabled={oauthAvailable === false}
				>
					Connect GitHub
				</Button>
				{oauthAvailable === false && (
					<p className="text-xs text-muted-foreground">
						OAuth is not configured, so use the raw URL option in edit mode.
					</p>
				)}
			</div>
		</section>
	);

	if (!editMode) {
		return (
			<div className="space-y-4">
				{viewCard}
				{link && link.parse_status && (
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<p className="text-sm font-semibold text-foreground">
								GitHub Data
							</p>
							<ParseStatusBadge status={link.parse_status} />
						</div>
						<GitHubDataPanel link={link} />
					</div>
				)}
			</div>
		);
	}

	return (
		<section className="space-y-4 rounded-xl border border-border bg-card p-6">
			{viewCard}

			{link && link.parse_status && (
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<p className="text-sm font-semibold text-foreground">
							GitHub Data
						</p>
						<ParseStatusBadge status={link.parse_status} />
					</div>
					<GitHubDataPanel link={link} />
				</div>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="rounded-xl border border-border bg-background/50 p-4">
					<p className="text-sm font-semibold text-foreground">OAuth</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Link your GitHub account and store an OAuth token for future sync.
					</p>
					<Button
						className="mt-4 w-full"
						onClick={onConnectOAuth}
						disabled={oauthAvailable === false}
					>
						Connect with GitHub
					</Button>
					{oauthAvailable === false && (
						<p className="mt-2 text-xs text-muted-foreground">
							OAuth is not configured in this environment.
						</p>
					)}
				</div>

				<div className="rounded-xl border border-border bg-background/50 p-4">
					<p className="text-sm font-semibold text-foreground">Raw URL</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Save a public GitHub profile URL without storing a token.
					</p>
					<input
						className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
						placeholder="https://github.com/username"
						value={draftUrl}
						onChange={(event) => setDraftUrl(event.target.value)}
					/>
					{error && <p className="mt-2 text-xs text-red-500">{error}</p>}
					<div className="mt-4 flex gap-2">
						<Button className="flex-1" onClick={handleManualSave}>
							Save URL
						</Button>
						{link && (
							<Button
								variant="outline"
								className="flex-1"
								onClick={onDisconnect}
							>
								Disconnect
							</Button>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
