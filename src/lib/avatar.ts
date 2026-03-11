const AVATAR_COLORS = [
  "#e54d42", // warm red
  "#e8742a", // orange
  "#d49a1a", // amber
  "#3a9a4f", // green
  "#2a9d8f", // teal
  "#22a4c4", // cyan
  "#3b82f6", // blue
  "#5b5bd6", // indigo
  "#8b5cf6", // violet
  "#d946a8", // pink
  "#e4567a", // rose
  "#64748b", // slate
] as const

export function getAvatarLetter(email: string): string {
  if (!email) return "?"
  return email.charAt(0).toUpperCase()
}

export function getAvatarColor(email: string): string {
  const hash = email
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
