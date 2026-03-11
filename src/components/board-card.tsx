import { Link } from "@tanstack/react-router"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Calendar } from "lucide-react"
import type { ProjectWithMemberCount } from "@/lib/queries/projects"

interface BoardCardProps {
  project: ProjectWithMemberCount
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function BoardCard({ project }: BoardCardProps) {
  return (
    <Link
      to="/board/$boardId"
      params={{ boardId: project.id }}
      className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="transition-all hover:ring-foreground/20 hover:shadow-md cursor-pointer">
        <CardHeader>
          <CardTitle className="truncate">{project.name}</CardTitle>
          <CardDescription className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {project.memberCount}{" "}
              {project.memberCount === 1 ? "member" : "members"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatDate(project.created_at)}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
