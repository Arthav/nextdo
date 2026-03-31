# Codex Notes

## Project Overview

- Project: `nextdo`
- App type: Next.js App Router to-do app
- Primary feature: manage daily tasks in the browser, with optional Gemini-assisted task generation
- UI stack: React 18, Next.js 14, TypeScript, Tailwind CSS, NextUI

This repository is no longer a generic starter, even though `README.md` still reads like a template. The real app branding is defined in `config/site.ts` as `CB's Todo Today App`.

## Runbook

- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Start production server: `npm run start`
- Lint and auto-fix: `npm run lint`

## Environment

- Required for AI task generation: `NEXT_PUBLIC_GEMINI_KEY`
- Current local env file: `.env`

Important: the Gemini key is read on the client in `components/TodoList.tsx`, so it is exposed to the browser. Treat this as a deliberate product tradeoff unless we refactor the AI flow to a server route.

## Main Entry Points

- `app/layout.tsx`: root layout, theme setup, navbar, footer
- `app/page.tsx`: home page that renders the to-do experience
- `components/TodoList.tsx`: main product logic and UI
- `app/providers.tsx`: NextUI + theme providers
- `config/site.ts`: app name, description, nav configuration
- `styles/globals.css`: global styles

## Behavior Summary

- Todos are stored in `localStorage`
- Cleared task sets are saved into `taskHistory` in `localStorage`
- First-time users get a guided tour via `driver.js`
- Completing a task triggers `canvas-confetti`
- Export supports plain text and HTML list output
- Editing, delete, clear-all, and history restore are handled inside `components/TodoList.tsx`

## Architecture Notes

- The core to-do flow is fully client-side
- `app/page.tsx` is marked `"use client"` and renders `TodoList`
- `components/TodoList.tsx` owns most state and modal behavior in one file
- Styling mixes Tailwind utility classes with NextUI components
- Theme support is wired through `next-themes` with dark theme as the default

## Repo-Specific Gotchas

- `README.md` is outdated and should not be treated as the source of truth
- `package.json` still uses the template package name `next-app-template`
- `npm run lint` uses ESLint with `--fix`, so it edits files
- Several secondary routes exist under `app/` (`about`, `blog`, `docs`, `pricing`) and may be mostly content or placeholder pages
- Footer text in `app/layout.tsx` currently contains a broken heart character encoding artifact

## Good Defaults For Future Changes

- Preserve App Router structure
- Prefer small focused components when modifying `components/TodoList.tsx`; it is already doing a lot
- Keep browser-only APIs such as `localStorage`, `window`, and `navigator.clipboard` inside client components
- If AI features expand, move Gemini access to a server-side boundary instead of adding more client-exposed API usage
- Update `README.md` if product behavior or setup changes significantly

## Suggested Next Cleanup

- Replace the starter `README.md` with project-specific documentation
- Split `components/TodoList.tsx` into smaller UI and state modules
- Move AI generation into a server action or API route
- Add tests for local task persistence and history restore behavior
