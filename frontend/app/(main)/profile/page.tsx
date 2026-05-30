"use client";

import { GitHubConnectSection } from "@/components/github-connect-section";
import { EducationSection } from "@/components/education-section";
import { HuggingFaceConnectSection } from "@/components/hugging-face-connect-section";
import { ProfileHero } from "@/components/profile-hero";
import { ProjectsSection } from "@/components/projects-section";
import { RolesSection } from "@/components/roles-section";
import { SkillsSection } from "@/components/skills-section";
import { useAuth } from "@/contexts/auth-context";
import {
  createEducation,
  createLink,
  createProject,
  deleteEducation,
  deleteLink,
  deleteProject,
  getAnalysisStatus,
  getMyProfile,
  getOAuthAuthorizationUrl,
  patchMyProfile,
  triggerAnalysis,
  updateEducation,
  updateLink,
  updateProject,
  upsertSkillTags,
} from "@/lib/api";
import type {
  ExternalURLRead,
  ProfileProjectCard,
  ProfileRead,
  ProfileSummaryStat,
} from "@/lib/profile-types";
import { splitTechnologiesUsed } from "@/lib/profile-types";
import { useEffect, useState } from "react";
import { Brain, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";

interface ProfileActionResponse {
  message: string;
  profile: ProfileRead;
}

function buildProfileSummary(profile: ProfileRead | null, email?: string) {
  if (!profile) {
    return email
      ? `Logged in as ${email}. Loading the rest of your profile.`
      : "Loading your profile.";
  }

  const pieces: string[] = [];
  if (profile.years_experience !== null) {
    pieces.push(`${profile.years_experience} years of experience`);
  }
  if (profile.age !== null) {
    pieces.push(`${profile.age} years old`);
  }
  if (profile.roles.length > 0) {
    pieces.push(`${profile.roles.length} roles`);
  }
  if (profile.skill_tags.length > 0) {
    pieces.push(`${profile.skill_tags.length} skill tags`);
  }

  if (pieces.length === 0) {
    return email
      ? `Profile loaded for ${email}, but no public summary fields are set yet.`
      : "Profile data loaded.";
  }

  return pieces.join(" · ");
}

function buildSummaryStats(profile: ProfileRead): ProfileSummaryStat[] {
  return [
    {
      label: "Experience",
      value:
        profile.years_experience !== null
          ? `${profile.years_experience} years`
          : "Not set",
    },
    {
      label: "Age",
      value: profile.age !== null ? `${profile.age}` : "Not set",
    },
    {
      label: "Roles",
      value: `${profile.roles.length}`,
    },
    {
      label: "Skills",
      value: `${profile.skill_tags.length}`,
    },
  ];
}

function buildProjectCards(profile: ProfileRead): ProfileProjectCard[] {
  return profile.project_history_entries.map((project) => ({
    id: project.id,
    name: project.project_name,
    duration: project.duration,
    role: project.role,
    description:
      project.description ??
      ([project.role, project.duration].filter(Boolean).join(" · ") ||
        "No project description provided."),
    technologies: splitTechnologiesUsed(project.technologies_used),
    is_hidden: project.is_hidden,
  }));
}

function getPrimaryGitHubLink(profile: ProfileRead): ExternalURLRead | null {
  return (
    profile.external_urls.find(
      (externalUrl) => externalUrl.url_type === "GITHUB",
    ) ?? null
  );
}

export default function ProfilePage() {
  const auth = useAuth();
  const user = auth.user;
  const [profile, setProfile] = useState<ProfileRead | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [externalNew, setExternalNew] = useState({
    url_type: "OTHER",
    url_str: "",
  });
  const [topEdit, setTopEdit] = useState({
    full_name: "",
    age: "",
    years_experience: "",
  });
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

  const logout = () => {
    auth.logout();
  }

  useEffect(() => {
    if (profile) {
      setTopEdit({
        full_name: profile.full_name ?? "",
        age: profile.age !== null ? String(profile.age) : "",
        years_experience:
          profile.years_experience !== null
            ? String(profile.years_experience)
            : "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (auth.isLoading || !user) {
      return;
    }

    let isActive = true;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);

      try {
        const profileData = await getMyProfile<ProfileRead>();
        if (isActive) {
          setProfile(profileData);
        }
      } catch (error) {
        if (isActive) {
          setProfile(null);
          setProfileError(
            error instanceof Error
              ? error.message
              : "Failed to load profile data.",
          );
        }
      } finally {
        if (isActive) {
          setProfileLoading(false);
        }
      }
    };

    const loadAnalysisStatus = async () => {
      try {
        const status = await getAnalysisStatus();
        if (isActive) {
          setLastAnalysis(status.last_ai_analysis);
        }
      } catch {
        // Silently ignore — analysis status is non-critical
      }
    };

    loadProfile();
    loadAnalysisStatus();

    return () => {
      isActive = false;
    };
  }, [auth.isLoading, user]);

  // FR-34: Auto-trigger re-analysis after profile changes (fire-and-forget)
  const triggerReAnalysis = async () => {
    try {
      await triggerAnalysis();
      const status = await getAnalysisStatus();
      setLastAnalysis(status.last_ai_analysis);
    } catch {
      // Non-blocking — analysis failure should not break profile save
    }
  };

  const displayName = profile?.full_name ?? user?.full_name ?? "Your profile";
  const displaySummary = "";
  const summaryStats = profile ? buildSummaryStats(profile) : [];
  const educationEntries = profile?.education_entries ?? [];
  const skills = profile?.skill_tags ?? [];
  const projects = profile ? buildProjectCards(profile) : [];
  const githubLink = profile ? getPrimaryGitHubLink(profile) : null;
  const huggingFaceLink = profile
    ? (profile.external_urls.find(
        (externalUrl) => externalUrl.url_type === "HUGGING_FACE",
      ) ?? null)
    : null;
  const otherExternalUrls = profile
    ? profile.external_urls.filter(
        (externalUrl) =>
          externalUrl.url_type !== "GITHUB" &&
          externalUrl.url_type !== "HUGGING_FACE",
      )
    : [];

  if (auth.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">You are not logged in.</p>
        <a href="/login" className="text-blue-500 hover:underline">
          Go to Login
        </a>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-8">
        <div className="w-full rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-semibold text-muted-foreground">Profile</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Unable to load your profile
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{profileError}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div className="flex items-center justify-end">
          <button
            className="rounded-md border px-3 py-1 text-sm"
            onClick={() => setEditMode((value) => !value)}
          >
            {editMode ? "Exit edit" : "Edit profile"}
          </button>
          <button
            className="rounded-md border px-3 py-1 text-sm"
            onClick={() => logout()}
          >
            Logout
          </button>
        </div>

        <ProfileHero
          name={displayName}
          summary={displaySummary}
          avatarUrl={undefined}
          stats={summaryStats}
        />

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Account
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Logged in user
              </h2>
            </div>
            {editMode && (
              <div className="flex gap-2">
                <button
                  className="rounded bg-green-500 px-3 py-1 text-white"
                  onClick={async () => {
                    try {
                      const payload: any = {};
                      if (topEdit.full_name !== "") {
                        payload.full_name = topEdit.full_name;
                      }
                      if (topEdit.age !== "") {
                        payload.age = Number(topEdit.age);
                      }
                      if (topEdit.years_experience !== "") {
                        payload.years_experience = Number(
                          topEdit.years_experience,
                        );
                      }
                      const updated =
                        await patchMyProfile<ProfileRead>(payload);
                      setProfile(updated);
                      triggerReAnalysis();
                    } catch (error) {
                      console.error(error);
                      alert("Failed to save profile");
                    }
                  }}
                >
                  Save
                </button>
                <button
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => {
                    if (profile) {
                      setTopEdit({
                        full_name: profile.full_name ?? "",
                        age: profile.age !== null ? String(profile.age) : "",
                        years_experience:
                          profile.years_experience !== null
                            ? String(profile.years_experience)
                            : "",
                      });
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Name</p>
                {editMode && profile && (
                  <button
                    aria-label={profile.is_hidden_full_name ? "Show name" : "Hide name"}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    onClick={async () => {
                      try {
                        const updated = await patchMyProfile<ProfileRead>({
                          is_hidden_full_name: !profile.is_hidden_full_name,
                        });
                        setProfile(updated);
                      } catch (error) {
                        console.error(error);
                        alert("Failed to update visibility");
                      }
                    }}
                  >
                    {profile.is_hidden_full_name ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {!editMode && (
                <p className="mt-1 text-base font-medium text-foreground">
                  {profile?.full_name ?? user.full_name}
                </p>
              )}
              {editMode && (
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={topEdit.full_name}
                  onChange={(event) =>
                    setTopEdit((state) => ({
                      ...state,
                      full_name: event.target.value,
                    }))
                  }
                />
              )}
            </div>

            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="mt-1 text-base font-medium text-foreground">
                {user.email}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Age</p>
                {editMode && profile && (
                  <button
                    aria-label={profile.is_hidden_age ? "Show age" : "Hide age"}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    onClick={async () => {
                      try {
                        const updated = await patchMyProfile<ProfileRead>({
                          is_hidden_age: !profile.is_hidden_age,
                        });
                        setProfile(updated);
                      } catch (error) {
                        console.error(error);
                        alert("Failed to update visibility");
                      }
                    }}
                  >
                    {profile.is_hidden_age ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {!editMode && (
                <p className="mt-1 text-base font-medium text-foreground">
                  {profile && profile.age !== null ? profile.age : "Not set"}
                </p>
              )}
              {editMode && (
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  inputMode="numeric"
                  value={topEdit.age}
                  onChange={(event) =>
                    setTopEdit((state) => ({
                      ...state,
                      age: event.target.value,
                    }))
                  }
                />
              )}
            </div>

            <div className="rounded-lg border border-border bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Years of experience
                </p>
                {editMode && profile && (
                  <button
                    aria-label={profile.is_hidden_years_experience ? "Show years of experience" : "Hide years of experience"}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    onClick={async () => {
                      try {
                        const updated = await patchMyProfile<ProfileRead>({
                          is_hidden_years_experience: !profile.is_hidden_years_experience,
                        });
                        setProfile(updated);
                      } catch (error) {
                        console.error(error);
                        alert("Failed to update visibility");
                      }
                    }}
                  >
                    {profile.is_hidden_years_experience ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {!editMode && (
                <p className="mt-1 text-base font-medium text-foreground">
                  {profile && profile.years_experience !== null
                    ? profile.years_experience
                    : "Not set"}
                </p>
              )}
              {editMode && (
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  inputMode="numeric"
                  value={topEdit.years_experience}
                  onChange={(event) =>
                    setTopEdit((state) => ({
                      ...state,
                      years_experience: event.target.value,
                    }))
                  }
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <EducationSection
            educationEntries={educationEntries}
            editMode={editMode}
            onCreate={async (payload) => {
              try {
                const updated = await createEducation<ProfileRead>(payload);
                setProfile(updated);
                triggerReAnalysis();
              } catch (error) {
                console.error(error);
                alert("Failed to create education entry");
              }
            }}
            onUpdate={async (educationId, payload) => {
              try {
                const updated = await updateEducation<ProfileRead>(
                  educationId,
                  payload,
                );
                setProfile(updated);
                triggerReAnalysis();
              } catch (error) {
                console.error(error);
                alert("Failed to update education entry");
              }
            }}
            onDelete={async (educationId) => {
              try {
                await deleteEducation(educationId);
                const updated = await getMyProfile<ProfileRead>();
                setProfile(updated);
                triggerReAnalysis();
              } catch (error) {
                console.error(error);
                alert("Failed to delete education entry");
              }
            }}
            onToggleVisibility={async (educationId, isHidden) => {
              try {
                const updated = await updateEducation<ProfileRead>(
                  educationId,
                  { is_hidden: isHidden },
                );
                setProfile(updated);
              } catch (error) {
                console.error(error);
                alert("Failed to update visibility");
              }
            }}
          />
        </div>

        <div>
          <SkillsSection
            skills={skills}
            editMode={editMode}
            onSave={async (tags: string[]) => {
              try {
                const updated = await upsertSkillTags<ProfileRead>({ tags });
                setProfile(updated);
                triggerReAnalysis();
              } catch (error) {
                console.error(error);
                alert("Failed to save skills");
              }
            }}
          />
        </div>

        <RolesSection roles={profile?.roles ?? []} />

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Brain className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                AI Role Analysis
              </p>
              <p className="text-xs text-muted-foreground">
                {lastAnalysis
                  ? `Last analyzed: ${new Date(lastAnalysis).toLocaleString()}`
                  : "Your profile has not been analyzed yet."}
              </p>
            </div>
          </div>

          {analysisMessage && (
            <p className="mt-3 text-sm text-muted-foreground">
              {analysisMessage}
            </p>
          )}

          <button
            className="mt-4 flex items-center gap-2 rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            disabled={analysisLoading}
            onClick={async () => {
              setAnalysisLoading(true);
              setAnalysisMessage(null);
              try {
                const response = await triggerAnalysis();
                setAnalysisMessage(
                  response.message || "Analysis started. Results will appear shortly.",
                );
              } catch (error) {
                setAnalysisMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to start analysis.",
                );
              } finally {
                setAnalysisLoading(false);
              }
            }}
          >
            {analysisLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {analysisLoading ? "Analyzing..." : "Re-analyze Profile"}
          </button>
        </div>

        <ProjectsSection
          projects={projects}
          title="Project history"
          emptyMessage="No project history has been added yet."
          editMode={editMode}
          onCreate={async (payload) => {
            try {
              const updated = await createProject<ProfileRead>(payload);
              setProfile(updated);
              triggerReAnalysis();
            } catch (error) {
              console.error(error);
              alert("Failed to create project");
            }
          }}
          onUpdate={async (projectId, payload) => {
            try {
              const updated = await updateProject<ProfileRead>(
                projectId,
                payload,
              );
              setProfile(updated);
              triggerReAnalysis();
            } catch (error) {
              console.error(error);
              alert("Failed to update project");
            }
          }}
          onDelete={async (projectId) => {
            try {
              await deleteProject(projectId);
              const updated = await getMyProfile<ProfileRead>();
              setProfile(updated);
              triggerReAnalysis();
            } catch (error) {
              console.error(error);
              alert("Failed to delete project");
            }
          }}
          onToggleVisibility={async (projectId, isHidden) => {
            try {
              const updated = await updateProject<ProfileRead>(
                projectId,
                { is_hidden: isHidden },
              );
              setProfile(updated);
            } catch (error) {
              console.error(error);
              alert("Failed to update visibility");
            }
          }}
        />

        {profile && (
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-muted-foreground">
              External links
            </p>
            <div className="mt-4 space-y-4">
              <GitHubConnectSection
                link={githubLink}
                editMode={editMode}
                onConnectOAuth={async () => {
                  try {
                    const response = await getOAuthAuthorizationUrl<{
                      provider: string;
                      authorization_url: string;
                      state: string;
                    }>("github");
                    window.location.href = response.authorization_url;
                  } catch (error) {
                    console.error(error);
                    alert("Failed to start GitHub OAuth");
                  }
                }}
                onSaveManual={async (url: string) => {
                  try {
                    const updated = githubLink
                      ? await updateLink<ProfileActionResponse>(githubLink.id, {
                          url_type: "GITHUB",
                          url_str: url,
                          source: "MANUAL",
                        })
                      : await createLink<ProfileActionResponse>({
                          url_type: "GITHUB",
                          url_str: url,
                          source: "MANUAL",
                        });

                    setProfile(updated.profile);
                  } catch (error) {
                    console.error(error);
                    alert("Failed to save GitHub URL");
                  }
                }}
                onDisconnect={async () => {
                  try {
                    if (!githubLink) {
                      return;
                    }

                    await deleteLink(githubLink.id);
                    const updated = await getMyProfile<ProfileRead>();
                    setProfile(updated);
                  } catch (error) {
                    console.error(error);
                    alert("Failed to disconnect GitHub");
                  }
                }}
              />

              <HuggingFaceConnectSection
                link={huggingFaceLink}
                editMode={editMode}
                onConnectOAuth={async () => {
                  try {
                    const response = await getOAuthAuthorizationUrl<{
                      provider: string;
                      authorization_url: string;
                      state: string;
                    }>("huggingface");
                    window.location.href = response.authorization_url;
                  } catch (error) {
                    console.error(error);
                    alert("Failed to start Hugging Face OAuth");
                  }
                }}
                onSaveManual={async (url: string) => {
                  try {
                    const updated = huggingFaceLink
                      ? await updateLink<ProfileActionResponse>(
                          huggingFaceLink.id,
                          {
                            url_type: "HUGGING_FACE",
                            url_str: url,
                            source: "MANUAL",
                          },
                        )
                      : await createLink<ProfileActionResponse>({
                          url_type: "HUGGING_FACE",
                          url_str: url,
                          source: "MANUAL",
                        });

                    setProfile(updated.profile);
                  } catch (error) {
                    console.error(error);
                    alert("Failed to save Hugging Face URL");
                  }
                }}
                onDisconnect={async () => {
                  try {
                    if (!huggingFaceLink) {
                      return;
                    }

                    await deleteLink(huggingFaceLink.id);
                    const updated = await getMyProfile<ProfileRead>();
                    setProfile(updated);
                  } catch (error) {
                    console.error(error);
                    alert("Failed to disconnect Hugging Face");
                  }
                }}
              />

              {otherExternalUrls.length > 0 && (
                <div className="space-y-2">
                  {otherExternalUrls.map((externalUrl) => (
                    <div
                      key={externalUrl.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4 text-sm text-foreground"
                    >
                      <a
                        href={externalUrl.url_str}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-foreground"
                      >
                        {externalUrl.url_type}: {externalUrl.url_str}
                      </a>
                      {editMode && (
                        <div className="flex gap-2">
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={async () => {
                              try {
                                const updated =
                                  await updateLink<ProfileActionResponse>(
                                    externalUrl.id,
                                    {
                                      url_str: externalUrl.url_str,
                                      url_type: externalUrl.url_type,
                                    },
                                  );
                                setProfile(updated.profile);
                              } catch (error) {
                                console.error(error);
                                alert("Failed to update link");
                              }
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs text-red-600"
                            onClick={async () => {
                              try {
                                await deleteLink(externalUrl.id);
                                const updated =
                                  await getMyProfile<ProfileRead>();
                                setProfile(updated);
                              } catch (error) {
                                console.error(error);
                                alert("Failed to delete link");
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {editMode && (
                <div className="mt-2 flex gap-2">
                  <select
                    value={externalNew.url_type}
                    onChange={(event) =>
                      setExternalNew((state) => ({
                        ...state,
                        url_type: event.target.value,
                      }))
                    }
                    className="rounded border px-2 py-1"
                  >
                    <option value="LINKEDIN">LINKEDIN</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                  <input
                    className="flex-1 rounded border px-2 py-1"
                    placeholder="https://..."
                    value={externalNew.url_str}
                    onChange={(event) =>
                      setExternalNew((state) => ({
                        ...state,
                        url_str: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="rounded bg-primary/90 px-3 py-1 text-white"
                    onClick={async () => {
                      try {
                        const updated = await createLink<ProfileActionResponse>(
                          {
                            url_type: externalNew.url_type,
                            url_str: externalNew.url_str,
                          },
                        );
                        setProfile(updated.profile);
                        setExternalNew({ url_type: "OTHER", url_str: "" });
                      } catch (error) {
                        console.error(error);
                        alert("Failed to add link");
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
