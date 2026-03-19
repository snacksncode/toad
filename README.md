<p align="center">
  <img src="public/icon-sakura.svg" width="80" height="80" alt="Toad">
</p>

<h1 align="center">Toad</h1>

<p align="center">
  A fast, local-first kanban board that lives in your browser.
  <br />
  No accounts. No servers. No loading spinners. Just your tasks.
</p>

---

## What is this?

Toad is a kanban board that stores everything in your browser's IndexedDB. There's nothing to sign up for, no backend to deploy, and no data leaves your machine.

Create boards, drag cards around, set due dates, mark things done — it all works instantly because there's zero network latency. Your data persists across sessions and browser restarts.

## Features

- **Boards & Columns** — Create multiple boards, each with customizable columns
- **Drag & Drop** — Reorder cards and columns with smooth DnD (desktop + mobile)
- **Due Dates** — Set deadlines, see overdue items highlighted in red
- **Completion** — Toggle cards as done with a single click
- **Labels & Priority** — Organize with colored labels and priority levels
- **Context Menus** — Right-click cards and columns for quick actions
- **Themes** — 4 built-in themes (Sakura, Sunset, Nature, Vintage) with light/dark mode
- **Themed Favicons** — Browser tab icon matches your selected theme
- **Demo Board** — One-click demo to see everything in action

## Tech

- [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query)
- [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- [dnd-kit](https://dndkit.com/) for drag & drop
- [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- TypeScript, Vite

## Getting Started

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) and you're in.

## What's next?

We're actively exploring making boards **shareable via UUID URLs** — so you could share a board link with anyone and they'd see (and edit) the same board. Think a lightweight, public-by-default kanban that Just Works without accounts.

This is still in exploration phase. If you have ideas, open an issue.

## License

MIT
