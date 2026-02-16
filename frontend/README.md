# Tarneeb/400 Frontend

Frontend-only application for the Tarneeb/400 card game. This repository contains the Next.js client application that communicates with a separate backend server.

## Purpose

This is a frontend-only workspace that provides the user interface for the Tarneeb/400 multiplayer card game. The backend is the source of truth for all game logic and state management.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Architecture Rules

- **App Router Only**: All routing must use Next.js App Router in the `app/` directory
- **Backend is Source of Truth**: All game logic and state management lives in the backend
- **Frontend Scope**: This repository handles UI rendering, user interactions, and client-side state management only
- **No Business Logic**: Game rules, validation, and core game mechanics are not implemented in the frontend

## Technology Stack

- Next.js 16+ with App Router
- TypeScript (strict mode)
- Tailwind CSS for styling
- React 19+

## Development Requirements

- Node.js 20+
- npm, yarn, pnpm, or bun package manager

## Project Structure

```
Frontend/
├── app/           # Next.js App Router routes and composition only
├── public/        # Static assets
└── styles/        # Design tokens (Phase 2)
```
