"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Github, Shield, Eye, Search, Save, CheckCircle2 } from "lucide-react"

export default function SettingsPage() {
    const [githubUrl, setGithubUrl] = useState("")
  const [makeSkillsPublic, setMakeSkillsPublic] = useState(true)
  const [showInSearch, setShowInSearch] = useState(true)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Simulate save
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your account preferences and privacy settings
            </p>
          </div>

          {/* GitHub URL Section */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Github className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">GitHub Profile</CardTitle>
                  <CardDescription>
                    Link your GitHub to showcase your work
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub URL</Label>
                <Input
                  id="github-url"
                  type="url"
                  placeholder="https://github.com/username"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed on your public profile
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings Section */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Shield className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Privacy Settings</CardTitle>
                  <CardDescription>
                    Control what others can see about you
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Make Skills Public */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Eye className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="skills-public" className="text-base font-medium">
                      Make Skills Public
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow team leaders to see your skills and proficiency levels
                    </p>
                  </div>
                </div>
                <Switch
                  id="skills-public"
                  checked={makeSkillsPublic}
                  onCheckedChange={setMakeSkillsPublic}
                />
              </div>

              <div className="border-t border-border" />

              {/* Show Profile in Search */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="show-in-search" className="text-base font-medium">
                      Show Profile in Search
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow your profile to appear in developer search results
                    </p>
                  </div>
                </div>
                <Switch
                  id="show-in-search"
                  checked={showInSearch}
                  onCheckedChange={setShowInSearch}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2">
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
  )
}
