import { ProfileHero } from "@/components/profile-hero"
import { SkillsSection } from "@/components/skills-section"
import { ProjectsSection } from "@/components/projects-section"
import { GitHubLink } from "@/components/github-link"

// Sample data for Sabrina's profile
const profileData = {
  name: "Sabrina",
  university: "KAIST",
  location: "Daejeon, South Korea",
  bio: "Passionate computer science student focused on building impactful software. I love exploring the intersection of AI and web development, creating tools that make developers' lives easier. Currently working on projects involving machine learning and full-stack development.",
  avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
}

const skills = [
  { name: "Rhino", level: "Expert" as const },
  { name: "TypeScript", level: "Advanced" as const },
  { name: "Python", level: "Advanced" as const },
  { name: "Node.js", level: "Intermediate" as const },
  { name: "Next.js", level: "Advanced" as const },
  { name: "TailwindCSS", level: "Expert" as const },
  { name: "PostgreSQL", level: "Intermediate" as const },
  { name: "Machine Learning", level: "Intermediate" as const },
  { name: "Docker", level: "Beginner" as const },
  { name: "Git", level: "Advanced" as const },
]

const projects = [
  {
    name: "AI Study Buddy",
    description: "An AI-powered study assistant that helps students understand complex topics using GPT-4 and retrieval-augmented generation.",
    technologies: ["Python", "FastAPI", "React", "OpenAI"],
    githubUrl: "https://github.com/sabrina/ai-study-buddy",
    liveUrl: "https://ai-study-buddy.vercel.app",
  },
  {
    name: "Coupang Buddies",
    description: "A platform for KAIST students to find coupang eats buddies",
    technologies: ["Next.js", "TypeScript", "TailwindCSS"],
    githubUrl: "https://github.com/sabrina/campus-connect",
  },
  {
    name: "Code Review Bot",
    description: "GitHub Action that automatically reviews PRs using AI, providing suggestions for code improvements and potential bugs.",
    technologies: ["TypeScript", "GitHub Actions", "OpenAI"],
    githubUrl: "https://github.com/sabrina/code-review-bot",
  },
  {
    name: "ML Pipeline Visualizer",
    description: "Interactive tool for visualizing and debugging machine learning pipelines, making it easier to understand data flow.",
    technologies: ["React", "D3.js", "Python", "Flask"],
    githubUrl: "https://github.com/SabrinaExample/ml-pipeline-viz",
    liveUrl: "https://ml-pipeline-viz.vercel.app",
  },
]

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <ProfileHero
            name={profileData.name}
            university={profileData.university}
            location={profileData.location}
            bio={profileData.bio}
            avatarUrl={profileData.avatarUrl}
          />

          {/* Skills Section */}
          <SkillsSection skills={skills} />

          {/* Projects Section */}
          <ProjectsSection projects={projects} />

          {/* GitHub Link */}
              <GitHubLink username="SabrinaExample-dev" />
        </div>
      </main>
  )
}



























