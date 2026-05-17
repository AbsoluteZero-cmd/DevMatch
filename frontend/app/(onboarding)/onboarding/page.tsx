"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { fetchProtectedApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { 
  ArrowRight, 
  ArrowLeft, 
  User, 
  GraduationCap, 
  Code, 
  FolderGit2,
  Github,
  CheckCircle2,
  Plus,
  X
} from "lucide-react"

type Step = 1 | 2 | 3 | 4 | 5

interface ProfileData {
  // Basic Info
  displayName: string
  bio: string
  location: string
  // Education
  university: string
  major: string
  graduationYear: string
  // Skills
  skills: { name: string; level: "Beginner" | "Intermediate" | "Advanced" | "Expert" }[]
  // Projects
  projects: { name: string; description: string; url: string }[]
  // External Accounts
  githubUsername: string
  huggingfaceUsername: string
}

const skillLevels = ["Beginner", "Intermediate", "Advanced", "Expert"] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [newSkill, setNewSkill] = useState("")
  const [newSkillLevel, setNewSkillLevel] = useState<typeof skillLevels[number]>("Intermediate")
  const [newProject, setNewProject] = useState({ name: "", description: "", url: "" })
  
  const [profile, setProfile] = useState<ProfileData>({
    displayName: "",
    bio: "",
    location: "",
    university: "",
    major: "",
    graduationYear: "",
    skills: [],
    projects: [],
    githubUsername: "",
    huggingfaceUsername: "",
  })

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const totalSteps = 5
  const progress = (step / totalSteps) * 100

  const updateProfile = (updates: Partial<ProfileData>) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  const addSkill = () => {
    if (newSkill.trim()) {
      updateProfile({
        skills: [...profile.skills, { name: newSkill.trim(), level: newSkillLevel }]
      })
      setNewSkill("")
      setNewSkillLevel("Intermediate")
    }
  }

  const removeSkill = (index: number) => {
    updateProfile({
      skills: profile.skills.filter((_, i) => i !== index)
    })
  }

  const addProject = () => {
    if (newProject.name.trim()) {
      updateProfile({
        projects: [...profile.projects, newProject]
      })
      setNewProject({ name: "", description: "", url: "" })
    }
  }

  const removeProject = (index: number) => {
    updateProfile({
      projects: profile.projects.filter((_, i) => i !== index)
    })
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return profile.displayName.trim().length > 0
      case 2:
        return profile.university.trim().length > 0
      case 3:
        return profile.skills.length > 0
      case 4:
        return true // Projects are optional
      case 5:
        return true // External accounts are optional
      default:
        return false
    }
  }

  const handleNext = async () => {
    if (step < 5) {
      setStep((step + 1) as Step)
    } else {
      // Save all profile data before redirecting to analysis
      setSaving(true)
      setSaveError(null)
      try {
        const json = (body: object) => ({
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        // 1. Basic info
        await fetchProtectedApi("/profile/me", {
          method: "PATCH",
          ...json({ full_name: profile.displayName || null, years_experience: null }),
        })

        // 2. Education
        if (profile.university.trim()) {
          await fetchProtectedApi("/profile/education", {
            method: "POST",
            ...json({
              institution_name: profile.university,
              degree: "Bachelor's Degree",
              major: profile.major || null,
              graduation_year: profile.graduationYear ? parseInt(profile.graduationYear) : null,
            }),
          })
        }

        // 3. Projects
        for (const proj of profile.projects) {
          await fetchProtectedApi("/profile/projects", {
            method: "POST",
            ...json({
              project_name: proj.name,
              description: proj.description || null,
              technologies_used: null,
              role: null,
            }),
          })
        }

        // 4. Skill tags
        for (const skill of profile.skills) {
          await fetchProtectedApi("/profile/tags", {
            method: "POST",
            ...json({ name: skill.name, is_ai_generated: false }),
          })
        }

        // 5. External links
        if (profile.githubUsername.trim()) {
          await fetchProtectedApi("/profile/links", {
            method: "POST",
            ...json({
              url_type: "GITHUB",
              url_str: `https://github.com/${profile.githubUsername}`,
              source: "MANUAL",
            }),
          })
        }
        if (profile.huggingfaceUsername.trim()) {
          await fetchProtectedApi("/profile/links", {
            method: "POST",
            ...json({
              url_type: "HUGGING_FACE",
              url_str: `https://huggingface.co/${profile.huggingfaceUsername}`,
              source: "MANUAL",
            }),
          })
        }

        router.push("/onboarding/analysis")
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save profile. Please try again.")
        setSaving(false)
      }
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step)
    }
  }

  const stepIcons = [User, GraduationCap, Code, FolderGit2, Github]
  const stepTitles = ["Basic Info", "Education", "Skills", "Projects", "Accounts"]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">D</span>
            </div>
            <span className="text-xl font-semibold text-foreground">DevMatch</span>
          </Link>
          <div className="text-sm text-muted-foreground">
            Step {step} of {totalSteps}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8">
        {/* Progress */}
        <div className="w-full max-w-2xl mb-8">
          <Progress value={progress} className="h-2" />
          <div className="mt-4 flex justify-between">
            {stepIcons.map((Icon, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  index + 1 < step 
                    ? "border-primary bg-primary text-primary-foreground"
                    : index + 1 === step
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                )}>
                  {index + 1 < step ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={cn(
                  "hidden text-xs sm:block",
                  index + 1 === step ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {stepTitles[index]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="w-full max-w-2xl border-border bg-card">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Tell us about yourself
                </CardTitle>
                <CardDescription>
                  This information will be displayed on your public profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    placeholder="How should we call you?"
                    value={profile.displayName}
                    onChange={(e) => updateProfile({ displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell others about yourself, your interests, and what you're looking for..."
                    value={profile.bio}
                    onChange={(e) => updateProfile({ bio: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={profile.location}
                    onChange={(e) => updateProfile({ location: e.target.value })}
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Education */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Education
                </CardTitle>
                <CardDescription>
                  Add your educational background to help teams find you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="university">University *</Label>
                  <Input
                    id="university"
                    placeholder="e.g., KAIST, Seoul National University"
                    value={profile.university}
                    onChange={(e) => updateProfile({ university: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">Major</Label>
                  <Input
                    id="major"
                    placeholder="e.g., Computer Science"
                    value={profile.major}
                    onChange={(e) => updateProfile({ major: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="graduationYear">Expected Graduation Year</Label>
                  <Input
                    id="graduationYear"
                    placeholder="e.g., 2025"
                    value={profile.graduationYear}
                    onChange={(e) => updateProfile({ graduationYear: e.target.value })}
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Skills */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Your Skills
                </CardTitle>
                <CardDescription>
                  Add your technical skills and proficiency levels. Be honest - our AI will verify these later!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Skill Form */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    placeholder="Skill name (e.g., React, Python)"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                  />
                  <select
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value as typeof skillLevels[number])}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {skillLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <Button onClick={addSkill} disabled={!newSkill.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Skills List */}
                {profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
                      >
                        <span className="text-sm font-medium text-foreground">{skill.name}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          skill.level === "Beginner" && "bg-gray-100 text-gray-700",
                          skill.level === "Intermediate" && "bg-blue-100 text-blue-700",
                          skill.level === "Advanced" && "bg-purple-100 text-purple-700",
                          skill.level === "Expert" && "bg-green-100 text-green-700"
                        )}>
                          {skill.level}
                        </span>
                        <button
                          onClick={() => removeSkill(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Add at least one skill to continue
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  * Skills will be verified and may be adjusted by our AI analysis based on your GitHub activity.
                </p>
              </CardContent>
            </>
          )}

          {/* Step 4: Projects */}
          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderGit2 className="h-5 w-5 text-primary" />
                  Your Projects
                </CardTitle>
                <CardDescription>
                  Showcase your best work. You can also import projects from GitHub later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Project Form */}
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <Input
                    placeholder="Project name"
                    value={newProject.name}
                    onChange={(e) => setNewProject(p => ({ ...p, name: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Brief description"
                    value={newProject.description}
                    onChange={(e) => setNewProject(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                  />
                  <Input
                    placeholder="Project URL (optional)"
                    value={newProject.url}
                    onChange={(e) => setNewProject(p => ({ ...p, url: e.target.value }))}
                  />
                  <Button onClick={addProject} disabled={!newProject.name.trim()} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Project
                  </Button>
                </div>

                {/* Projects List */}
                {profile.projects.length > 0 && (
                  <div className="space-y-3">
                    {profile.projects.map((project, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between rounded-lg border border-border bg-muted/30 p-4"
                      >
                        <div>
                          <h4 className="font-medium text-foreground">{project.name}</h4>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                          )}
                          {project.url && (
                            <a href={project.url} className="text-xs text-primary hover:underline mt-1 block">
                              {project.url}
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => removeProject(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {profile.projects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No projects added yet. You can skip this step and add projects later.
                  </p>
                )}
              </CardContent>
            </>
          )}

          {/* Step 5: External Accounts */}
          {step === 5 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5 text-primary" />
                  Connect Your Accounts
                </CardTitle>
                <CardDescription>
                  Link your GitHub and HuggingFace accounts for automatic skill analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="github" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    GitHub Username
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3">
                      <span className="text-sm text-muted-foreground">github.com/</span>
                    </div>
                    <Input
                      id="github"
                      placeholder="username"
                      value={profile.githubUsername}
                      onChange={(e) => updateProfile({ githubUsername: e.target.value })}
                      className="rounded-l-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connecting GitHub allows us to analyze your repositories and accurately assess your skills.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="huggingface" className="flex items-center gap-2">
                    <span className="text-lg">🤗</span>
                    HuggingFace Username
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3">
                      <span className="text-sm text-muted-foreground">huggingface.co/</span>
                    </div>
                    <Input
                      id="huggingface"
                      placeholder="username"
                      value={profile.huggingfaceUsername}
                      onChange={(e) => updateProfile({ huggingfaceUsername: e.target.value })}
                      className="rounded-l-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional: Link your HuggingFace for ML/AI skill verification.
                  </p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="font-medium text-foreground mb-2">What happens next?</h4>
                  <p className="text-sm text-muted-foreground">
                    After completing this step, our AI will analyze your profile and connected accounts 
                    to generate accurate skill assessments. This usually takes about 30 seconds.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="flex flex-col gap-2 border-t border-border p-6">
            {saveError && (
              <p className="text-sm text-destructive text-center">{saveError}</p>
            )}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={step === 1 || saving}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed() || saving}
              >
                {saving ? "Saving…" : step === 5 ? "Run AI Analysis" : "Continue"}
                {!saving && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
