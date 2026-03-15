import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar } from "@/components/avatar"
import {
  getProjectMembers,
  addMember,
  removeMember,
} from "@/lib/queries/members"
import type { ProjectMember } from "@/lib/database.types"
import { toast } from "sonner"
import { Loader2, Trash2, UserPlus, UserMinus } from "lucide-react"

interface BoardSettingsProps {
  projectId: string
  projectName: string
  currentUserId: string
  onRename: (name: string) => void
  onDelete: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BoardSettings({
  projectId,
  projectName,
  currentUserId,
  onRename,
  onDelete,
  open,
  onOpenChange,
}: BoardSettingsProps) {
  const [name, setName] = useState(projectName)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [newEmail, setNewEmail] = useState("")
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const currentUserMember = members.find((m) => m.user_id === currentUserId)
  const isOwner = currentUserMember?.role === "owner"

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true)
    try {
      const data = await getProjectMembers(projectId)
      setMembers(data)
    } catch {
      toast.error("Failed to load members")
    } finally {
      setLoadingMembers(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open) {
      setName(projectName)
      fetchMembers()
    }
  }, [open, projectName, fetchMembers])

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === projectName) return
    setSaving(true)
    try {
      onRename(trimmed)
      toast.success("Board renamed")
    } catch {
      toast.error("Failed to rename board")
    } finally {
      setSaving(false)
    }
  }

  const handleAddMember = async () => {
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed) return

    setAddingMember(true)
    try {
      await addMember(projectId, trimmed)
      setNewEmail("")
      await fetchMembers()
      toast.success("Member invited")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      // Check for Postgres unique constraint error
      const isPostgresError = (
        e: unknown
      ): e is { code: string; message: string } =>
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        typeof (e as any).code === "string"

      if (isPostgresError(err) && err.code === "23505") {
        toast.error("This email has already been invited")
      } else {
        toast.error(message || "Failed to add member")
      }
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId)
    try {
      await removeMember(memberId)
      await fetchMembers()
      toast.success("Member removed")
    } catch {
      toast.error("Failed to remove member")
    } finally {
      setRemovingId(null)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      onDelete()
    } catch {
      toast.error("Failed to delete board")
      setDeleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Board Settings</SheetTitle>
          <SheetDescription>
            Manage your board name, members, and more.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {/* Board Name Section */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="board-name" className="text-sm font-medium">
              Board Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                }}
                placeholder="Board name"
              />
              <Button
                onClick={handleSaveName}
                disabled={saving || !name.trim() || name.trim() === projectName}
                size="sm"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Members Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Members</Label>
              {loadingMembers && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Member List */}
            <div className="flex flex-col gap-2">
              {members.map((member) => {
                const isActive = member.user_id !== null
                const isSelf = member.user_id === currentUserId
                const isMemberOwner = member.role === "owner"
                const canRemove = isOwner && !isSelf && !isMemberOwner

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2"
                  >
                    <Avatar email={member.invited_email} size="sm" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">
                        {member.invited_email}
                        {isSelf && (
                          <span className="text-muted-foreground"> (you)</span>
                        )}
                      </span>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge
                          variant={isMemberOwner ? "default" : "secondary"}
                        >
                          {member.role}
                        </Badge>
                        <Badge variant={isActive ? "outline" : "ghost"}>
                          {isActive ? "Active" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingId === member.id}
                        title="Remove member"
                      >
                        {removingId === member.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="size-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add Member (owner only) */}
            {isOwner && (
              <div className="mt-1 flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddMember()
                  }}
                  placeholder="Invite by email"
                  type="email"
                />
                <Button
                  onClick={handleAddMember}
                  disabled={addingMember || !newEmail.trim()}
                  size="sm"
                >
                  {addingMember ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Danger Zone (owner only) */}
          {isOwner && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium text-destructive">
                  Danger Zone
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this board and all its data. This action
                  cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 size-4" />
                      Delete Board
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Board</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete &ldquo;{projectName}&rdquo;
                        and all its columns, issues, and members. This cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : null}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
