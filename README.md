<p align="center">
  <img src="public/icon-sakura.svg" width="80" height="80" alt="Toad">
</p>

<h1 align="center">Toad: Personal Task Board</h1>

---

Toad is a kanban board that runs in your browser. Your data is stored locally via IndexedDB. Shareable collaborative boards are in the works.

## Features

- Multiple boards with customizable columns
- Drag & drop for cards and columns (desktop + mobile)
- Due dates with overdue highlighting
- Priority levels (low / medium / high) and colored labels
- Filter and search across cards
- Right-click context menus for quick actions
- 4 themes (Sakura, Sunset, Nature, Vintage) × light/dark mode
- Demo board to kick the tires

## Tech stack

| Layer     | What                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Framework | [TanStack Start](https://tanstack.com/start) + [Router](https://tanstack.com/router) + [Query](https://tanstack.com/query) |
| UI        | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/)                                          |
| Storage   | [Dexie.js](https://dexie.org/) (IndexedDB)                                                                                 |
| DnD       | [dnd-kit](https://dndkit.com/)                                                                                             |
| Language  | TypeScript, React 19                                                                                                       |
| Build     | Vite                                                                                                                       |

## Getting started

```bash
bun install
bun run dev
```

Opens on [localhost:3000](http://localhost:3000).

## Roadmap

**Shareable boards** are next. Share a UUID link, anyone with it can view and edit. No accounts needed.

Ideas welcome, open an issue.

## License

MIT
