"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Film,
  FileText,
  HelpCircle,
  Video,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VideoUpload } from "@/components/courses/video-upload"

interface Section {
  id: string
  title: string
  description: string | null
  position: number
  lectures: Lecture[]
}

interface Lecture {
  id: string
  title: string
  description: string | null
  type: "VIDEO" | "TEXT" | "QUIZ"
  position: number
  videoUrl: string | null
  videoDuration: number | null
  videoPublicId: string | null
  content: string | null
  isFreePreview: boolean
}

interface CourseContentEditorProps {
  courseId: string
  sections: Section[]
}

const lectureTypeIcons = {
  VIDEO: Film,
  TEXT: FileText,
  QUIZ: HelpCircle,
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function CourseContentEditor({
  courseId,
  sections: initialSections,
}: CourseContentEditorProps) {
  const queryClient = useQueryClient()

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(initialSections.map((s) => s.id))
  )

  // Section dialogs
  const [showAddSection, setShowAddSection] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [deletingSection, setDeletingSection] = useState<Section | null>(null)
  const [sectionTitle, setSectionTitle] = useState("")
  const [sectionDesc, setSectionDesc] = useState("")
  const [sectionLoading, setSectionLoading] = useState(false)

  // Lecture dialogs
  const [addLectureToSection, setAddLectureToSection] = useState<string | null>(null)
  const [editingLecture, setEditingLecture] = useState<{
    lecture: Lecture
    sectionId: string
  } | null>(null)
  const [deletingLecture, setDeletingLecture] = useState<{
    lecture: Lecture
    sectionId: string
  } | null>(null)
  const [lectureTitle, setLectureTitle] = useState("")
  const [lectureDesc, setLectureDesc] = useState("")
  const [lectureType, setLectureType] = useState<"VIDEO" | "TEXT" | "QUIZ">("VIDEO")
  const [lectureIsFree, setLectureIsFree] = useState(false)
  const [lectureContent, setLectureContent] = useState("")
  const [lectureLoading, setLectureLoading] = useState(false)
  const [isVideoUploading, setIsVideoUploading] = useState(false)

  // Video data for lecture create/edit
  const [videoData, setVideoData] = useState<{
    videoUrl: string
    videoPublicId: string
    videoDuration: number
  } | null>(null)

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function refreshCourse() {
    await queryClient.invalidateQueries({ queryKey: ["course", courseId] })
  }

  // ─── Section CRUD ────────────────────────────────────────

  function openAddSection() {
    setSectionTitle("")
    setSectionDesc("")
    setShowAddSection(true)
  }

  function openEditSection(section: Section) {
    setSectionTitle(section.title)
    setSectionDesc(section.description || "")
    setEditingSection(section)
  }

  async function handleAddSection() {
    if (!sectionTitle.trim()) return
    setSectionLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sectionTitle.trim(),
          description: sectionDesc.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create section")
      }
      toast.success("Section added")
      setShowAddSection(false)
      await refreshCourse()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create section")
    } finally {
      setSectionLoading(false)
    }
  }

  async function handleEditSection() {
    if (!editingSection || !sectionTitle.trim()) return
    setSectionLoading(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/sections/${editingSection.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: sectionTitle.trim(),
            description: sectionDesc.trim() || null,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update section")
      }
      toast.success("Section updated")
      setEditingSection(null)
      await refreshCourse()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update section")
    } finally {
      setSectionLoading(false)
    }
  }

  async function handleDeleteSection() {
    if (!deletingSection) return
    setSectionLoading(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/sections/${deletingSection.id}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete section")
      }
      toast.success("Section deleted")
      setDeletingSection(null)
      await refreshCourse()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete section")
    } finally {
      setSectionLoading(false)
    }
  }

  // ─── Lecture CRUD ────────────────────────────────────────

  function openAddLecture(sectionId: string) {
    setLectureTitle("")
    setLectureDesc("")
    setLectureType("VIDEO")
    setLectureIsFree(false)
    setLectureContent("")
    setVideoData(null)
    setIsVideoUploading(false)
    setAddLectureToSection(sectionId)
  }

  function openEditLecture(lecture: Lecture, sectionId: string) {
    setLectureTitle(lecture.title)
    setLectureDesc(lecture.description || "")
    setLectureType(lecture.type)
    setLectureIsFree(lecture.isFreePreview)
    setLectureContent(lecture.content || "")
    setIsVideoUploading(false)
    setVideoData(
      lecture.videoUrl
        ? {
            videoUrl: lecture.videoUrl,
            videoPublicId: lecture.videoPublicId || "",
            videoDuration: lecture.videoDuration || 0,
          }
        : null
    )
    setEditingLecture({ lecture, sectionId })
  }

  async function handleAddLecture() {
    if (!addLectureToSection || !lectureTitle.trim()) return
    setLectureLoading(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/sections/${addLectureToSection}/lectures`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: lectureTitle.trim(),
            description: lectureDesc.trim() || undefined,
            type: lectureType,
            isFreePreview: lectureIsFree,
            ...(lectureType === "VIDEO"
              ? {
                  videoUrl: videoData?.videoUrl || "",
                  videoDuration: videoData?.videoDuration || 0,
                  videoPublicId: videoData?.videoPublicId || undefined,
                }
              : {
                  content: lectureContent.trim() || undefined,
                }),
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        const msg = err.issues
          ? err.issues.map((i: { message: string }) => i.message).join(", ")
          : err.error || "Failed to create lecture"
        throw new Error(msg)
      }
      toast.success("Lecture added")
      setAddLectureToSection(null)
      await refreshCourse()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lecture")
    } finally {
      setLectureLoading(false)
    }
  }

  async function handleEditLecture() {
    if (!editingLecture || !lectureTitle.trim()) return
    setLectureLoading(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/sections/${editingLecture.sectionId}/lectures/${editingLecture.lecture.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: lectureTitle.trim(),
            description: lectureDesc.trim() || null,
            type: lectureType,
            isFreePreview: lectureIsFree,
            ...(lectureType === "VIDEO"
              ? {
                  videoUrl: videoData?.videoUrl || "",
                  videoDuration: videoData?.videoDuration || 0,
                  videoPublicId: videoData?.videoPublicId || undefined,
                }
              : {
                  content: lectureContent.trim() || null,
                }),
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        const msg = err.issues
          ? err.issues.map((i: { message: string }) => i.message).join(", ")
          : err.error || "Failed to update lecture"
        throw new Error(msg)
      }
      toast.success("Lecture updated")
      setEditingLecture(null)
      await refreshCourse()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update lecture")
    } finally {
      setLectureLoading(false)
    }
  }

  async function handleDeleteLecture() {
    if (!deletingLecture) return
    setLectureLoading(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/sections/${deletingLecture.sectionId}/lectures/${deletingLecture.lecture.id}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete lecture")
      }
      toast.success("Lecture deleted")
      setDeletingLecture(null)
      await refreshCourse()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete lecture")
    } finally {
      setLectureLoading(false)
    }
  }

  // ─── Cloudinary thumbnail helper (client-side) ──────────
  function getThumbnailUrl(publicId: string | null): string | null {
    if (!publicId) return null
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    return `https://res.cloudinary.com/${cloudName}/video/upload/w_640,h_360,c_fill,so_0/${publicId}.jpg`
  }

  // ─── Render ──────────────────────────────────────────────

  const totalLectures = initialSections.reduce(
    (acc, s) => acc + s.lectures.length,
    0
  )

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Course Content</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {initialSections.length} section{initialSections.length !== 1 ? "s" : ""} &middot;{" "}
              {totalLectures} lecture{totalLectures !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openAddSection} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialSections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No sections yet. Add your first section to get started.</p>
            </div>
          ) : (
            initialSections.map((section) => {
              const isExpanded = expandedSections.has(section.id)
              return (
                <div
                  key={section.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Section header */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => toggleSection(section.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">
                        Section {section.position + 1}: {section.title}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {section.lectures.length} lecture
                        {section.lectures.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditSection(section)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingSection(section)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Lectures list */}
                  {isExpanded && (
                    <div className="divide-y">
                      {section.lectures.map((lecture) => {
                        const Icon = lectureTypeIcons[lecture.type]
                        return (
                          <div
                            key={lecture.id}
                            className="flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-muted/20 transition-colors group"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{lecture.title}</span>
                              {lecture.isFreePreview && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs bg-green-100 text-green-800"
                                >
                                  Free Preview
                                </Badge>
                              )}
                            </div>
                            {lecture.type === "VIDEO" && lecture.videoDuration && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(lecture.videoDuration)}
                              </span>
                            )}
                            {lecture.type === "VIDEO" && (
                              <div className="shrink-0">
                                {lecture.videoUrl ? (
                                  <Video className="h-3.5 w-3.5 text-green-600" />
                                ) : (
                                  <Video className="h-3.5 w-3.5 text-muted-foreground/40" />
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  openEditLecture(lecture, section.id)
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() =>
                                  setDeletingLecture({
                                    lecture,
                                    sectionId: section.id,
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}

                      {/* Add lecture button */}
                      <div className="px-4 py-2 pl-12">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => openAddLecture(section.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Lecture
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* ─── Add Section Dialog ────────────────────────────── */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g., Getting Started"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSection()
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of this section"
                value={sectionDesc}
                onChange={(e) => setSectionDesc(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={sectionLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleAddSection}
              disabled={sectionLoading || !sectionTitle.trim()}
            >
              {sectionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Section Dialog ───────────────────────────── */}
      <Dialog
        open={!!editingSection}
        onOpenChange={(open) => !open && setEditingSection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSection()
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={sectionDesc}
                onChange={(e) => setSectionDesc(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingSection(null)}
              disabled={sectionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSection}
              disabled={sectionLoading || !sectionTitle.trim()}
            >
              {sectionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Section Dialog ─────────────────────────── */}
      <Dialog
        open={!!deletingSection}
        onOpenChange={(open) => !open && setDeletingSection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{deletingSection?.title}&rdquo;?
            This will also delete all {deletingSection?.lectures.length ?? 0}{" "}
            lecture{(deletingSection?.lectures.length ?? 0) !== 1 ? "s" : ""} in
            this section. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingSection(null)}
              disabled={sectionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSection}
              disabled={sectionLoading}
            >
              {sectionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Lecture Dialog ─────────────────────────────── */}
      <Dialog
        open={!!addLectureToSection}
        onOpenChange={(open) => {
          if (!open) {
            setIsVideoUploading(false)
            setAddLectureToSection(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Lecture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g., Introduction to React"
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="What will students learn in this lecture?"
                value={lectureDesc}
                onChange={(e) => setLectureDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={lectureType}
                  onValueChange={(v) => setLectureType(v as "VIDEO" | "TEXT" | "QUIZ")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="QUIZ">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="free-preview-add"
                    checked={lectureIsFree}
                    onCheckedChange={setLectureIsFree}
                  />
                  <Label htmlFor="free-preview-add" className="text-sm">
                    Free Preview
                  </Label>
                </div>
              </div>
            </div>
            {lectureType === "VIDEO" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Video</Label>
                  <VideoUpload
                    onUploadComplete={(data) => {
                      setVideoData(data)
                      setIsVideoUploading(false)
                    }}
                    onUploadStart={() => setIsVideoUploading(true)}
                    onUploadCancel={() => setIsVideoUploading(false)}
                    disabled={lectureLoading}
                  />
                </div>
              </>
            )}
            {lectureType === "TEXT" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Write the lecture content here..."
                    value={lectureContent}
                    onChange={(e) => setLectureContent(e.target.value)}
                    rows={8}
                    className="min-h-[200px]"
                  />
                </div>
              </>
            )}
            {lectureType === "QUIZ" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Quiz Content</Label>
                  <Textarea
                    placeholder="Enter quiz questions and answers (one per line, format: Q: question / A: answer)"
                    value={lectureContent}
                    onChange={(e) => setLectureContent(e.target.value)}
                    rows={8}
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Use &ldquo;Q:&rdquo; for questions and &ldquo;A:&rdquo; for answers, one per line.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddLectureToSection(null)}
              disabled={lectureLoading || isVideoUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLecture}
              disabled={lectureLoading || !lectureTitle.trim() || isVideoUploading}
            >
              {lectureLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Lecture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Lecture Dialog ────────────────────────────── */}
      <Dialog
        open={!!editingLecture}
        onOpenChange={(open) => {
          if (!open) {
            setIsVideoUploading(false)
            setEditingLecture(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Lecture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={lectureDesc}
                onChange={(e) => setLectureDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={lectureType}
                  onValueChange={(v) => setLectureType(v as "VIDEO" | "TEXT" | "QUIZ")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="QUIZ">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="free-preview-edit"
                    checked={lectureIsFree}
                    onCheckedChange={setLectureIsFree}
                  />
                  <Label htmlFor="free-preview-edit" className="text-sm">
                    Free Preview
                  </Label>
                </div>
              </div>
            </div>
            {lectureType === "VIDEO" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Video</Label>
                  <VideoUpload
                    onUploadComplete={(data) => {
                      setVideoData(data)
                      setIsVideoUploading(false)
                    }}
                    onUploadStart={() => setIsVideoUploading(true)}
                    onUploadCancel={() => setIsVideoUploading(false)}
                    existingVideoUrl={editingLecture?.lecture.videoUrl}
                    existingThumbnail={getThumbnailUrl(
                      editingLecture?.lecture.videoPublicId ?? null
                    )}
                    disabled={lectureLoading}
                  />
                </div>
              </>
            )}
            {lectureType === "TEXT" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Write the lecture content here..."
                    value={lectureContent}
                    onChange={(e) => setLectureContent(e.target.value)}
                    rows={8}
                    className="min-h-[200px]"
                  />
                </div>
              </>
            )}
            {lectureType === "QUIZ" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Quiz Content</Label>
                  <Textarea
                    placeholder="Enter quiz questions and answers (one per line, format: Q: question / A: answer)"
                    value={lectureContent}
                    onChange={(e) => setLectureContent(e.target.value)}
                    rows={8}
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Use &ldquo;Q:&rdquo; for questions and &ldquo;A:&rdquo; for answers, one per line.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingLecture(null)}
              disabled={lectureLoading || isVideoUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditLecture}
              disabled={lectureLoading || !lectureTitle.trim() || isVideoUploading}
            >
              {lectureLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Lecture Dialog ──────────────────────────── */}
      <Dialog
        open={!!deletingLecture}
        onOpenChange={(open) => !open && setDeletingLecture(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lecture</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{deletingLecture?.lecture.title}
            &rdquo;? {deletingLecture?.lecture.videoUrl &&
              "The associated video will also be removed from storage. "}
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingLecture(null)}
              disabled={lectureLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLecture}
              disabled={lectureLoading}
            >
              {lectureLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Lecture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
