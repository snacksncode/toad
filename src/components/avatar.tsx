import { getAvatarLetter, getAvatarColor } from "@/lib/avatar"

interface AvatarProps {
  email: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
}

export function Avatar({ email, size = "md" }: AvatarProps) {
  const letter = getAvatarLetter(email)
  const color = getAvatarColor(email)

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-medium text-white select-none shrink-0 ${sizeClasses[size]}`}
      style={{ backgroundColor: color }}
      title={email}
    >
      {letter}
    </div>
  )
}
