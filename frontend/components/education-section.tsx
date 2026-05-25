"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DegreeType, EducationRead } from "@/lib/profile-types";
import { GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";

interface EducationSectionProps {
  educationEntries: EducationRead[];
  editMode?: boolean;
  onCreate?: (payload: {
    institution_name: string;
    degree: DegreeType;
    major?: string | null;
    graduation_year?: number | null;
  }) => Promise<void> | void;
  onUpdate?: (
    educationId: number,
    payload: {
      institution_name?: string;
      degree?: DegreeType;
      major?: string | null;
      graduation_year?: number | null;
    },
  ) => Promise<void> | void;
  onDelete?: (educationId: number) => Promise<void> | void;
}

interface EducationDraft {
  institution_name: string;
  degree: DegreeType;
  major: string;
  graduation_year: string;
}

const degreeOptions: DegreeType[] = [
  "PhD",
  "Master's Degree",
  "Bachelor's Degree",
  "High School Diploma",
  "Other",
];

const emptyDraft: EducationDraft = {
  institution_name: "",
  degree: "Bachelor's Degree",
  major: "",
  graduation_year: "",
};

function buildPayload(draft: EducationDraft) {
  return {
    institution_name: draft.institution_name.trim(),
    degree: draft.degree,
    major: draft.major.trim() ? draft.major.trim() : null,
    graduation_year: draft.graduation_year.trim()
      ? Number(draft.graduation_year)
      : null,
  };
}

export function EducationSection({
  educationEntries,
  editMode,
  onCreate,
  onUpdate,
  onDelete,
}: EducationSectionProps) {
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<EducationDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<EducationDraft>(emptyDraft);

  useEffect(() => {
    if (!creating) {
      setCreateDraft(emptyDraft);
    }
  }, [creating]);

  useEffect(() => {
    if (editingId === null) {
      setEditingDraft(emptyDraft);
      return;
    }

    const current = educationEntries.find((entry) => entry.id === editingId);
    if (!current) {
      setEditingId(null);
      setEditingDraft(emptyDraft);
      return;
    }

    setEditingDraft({
      institution_name: current.institution_name,
      degree: current.degree,
      major: current.major ?? "",
      graduation_year:
        current.graduation_year !== null ? String(current.graduation_year) : "",
    });
  }, [editingId, educationEntries]);

  const startEdit = (education: EducationRead) => {
    setCreating(false);
    setEditingId(education.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingDraft(emptyDraft);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Education</h2>
        <span className="text-sm text-muted-foreground">
          {educationEntries.length} entries
        </span>
      </div>

      {educationEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No education history has been added yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {educationEntries.map((education) => {
            const isEditing = editingId === education.id;

            return (
              <Card
                key={education.id}
                className="overflow-hidden border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {education.institution_name}
                        </CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          {education.degree}
                        </CardDescription>
                      </div>
                    </div>

                    {editMode && onUpdate && onDelete && !isEditing && (
                      <div className="flex gap-2">
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() => startEdit(education)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs text-red-600"
                          onClick={async () => {
                            if (!education.id) {
                              return;
                            }

                            await onDelete(education.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {isEditing ? (
                    <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
                      <input
                        className="w-full rounded border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
                        placeholder="Institution name"
                        value={editingDraft.institution_name}
                        onChange={(event) =>
                          setEditingDraft((state) => ({
                            ...state,
                            institution_name: event.target.value,
                          }))
                        }
                      />

                      <select
                        className="w-full rounded border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
                        value={editingDraft.degree}
                        onChange={(event) =>
                          setEditingDraft((state) => ({
                            ...state,
                            degree: event.target.value as DegreeType,
                          }))
                        }
                      >
                        {degreeOptions.map((degreeOption) => (
                          <option key={degreeOption} value={degreeOption}>
                            {degreeOption}
                          </option>
                        ))}
                      </select>

                      <input
                        className="w-full rounded border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
                        placeholder="Major"
                        value={editingDraft.major}
                        onChange={(event) =>
                          setEditingDraft((state) => ({
                            ...state,
                            major: event.target.value,
                          }))
                        }
                      />

                      <input
                        className="w-full rounded border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
                        placeholder="Graduation year"
                        inputMode="numeric"
                        value={editingDraft.graduation_year}
                        onChange={(event) =>
                          setEditingDraft((state) => ({
                            ...state,
                            graduation_year: event.target.value,
                          }))
                        }
                      />

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={async () => {
                            if (!onUpdate || !editingId) {
                              return;
                            }

                            await onUpdate(
                              editingId,
                              buildPayload(editingDraft),
                            );
                            setEditingId(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="secondary"
                          className="rounded-full px-2.5 py-1"
                        >
                          {education.degree}
                        </Badge>
                        {education.graduation_year !== null && (
                          <Badge
                            variant="outline"
                            className="rounded-full px-2.5 py-1"
                          >
                            {education.graduation_year}
                          </Badge>
                        )}
                      </div>

                      {education.major && (
                        <p className="text-sm text-muted-foreground">
                          Major: {education.major}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editMode && onCreate && !creating && (
        <Button onClick={() => setCreating(true)}>Add education</Button>
      )}

      {editMode && onCreate && creating && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">
            Add education
          </h3>
          <input
            className="w-full rounded border border-border bg-background/50 px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
            placeholder="Institution name"
            value={createDraft.institution_name}
            onChange={(event) =>
              setCreateDraft((state) => ({
                ...state,
                institution_name: event.target.value,
              }))
            }
          />
          <select
            className="w-full rounded border border-border bg-background/50 px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
            value={createDraft.degree}
            onChange={(event) =>
              setCreateDraft((state) => ({
                ...state,
                degree: event.target.value as DegreeType,
              }))
            }
          >
            {degreeOptions.map((degreeOption) => (
              <option key={degreeOption} value={degreeOption}>
                {degreeOption}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded border border-border bg-background/50 px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
            placeholder="Major"
            value={createDraft.major}
            onChange={(event) =>
              setCreateDraft((state) => ({
                ...state,
                major: event.target.value,
              }))
            }
          />
          <input
            className="w-full rounded border border-border bg-background/50 px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
            placeholder="Graduation year"
            inputMode="numeric"
            value={createDraft.graduation_year}
            onChange={(event) =>
              setCreateDraft((state) => ({
                ...state,
                graduation_year: event.target.value,
              }))
            }
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={async () => {
                if (!onCreate) {
                  return;
                }

                await onCreate(buildPayload(createDraft));
                setCreating(false);
                setCreateDraft(emptyDraft);
              }}
            >
              Save education
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
