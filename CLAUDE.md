# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Database
- Supabase is used for backend services
- Database migrations are in `supabase/migrations/`
- Local development connects to hosted Supabase instance

## Architecture Overview

This is a React-based Trello clone built with modern web technologies:

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Query + Context API
- **Drag & Drop**: @hello-pangea/dnd
- **Routing**: React Router v6

### Key Architecture Patterns

#### Data Flow
- **Authentication**: AuthContext manages user state and Supabase auth
- **Project Management**: ProjectContext handles project selection and switching
- **Data Fetching**: React Query for server state with custom hooks in `hooks/` directory
- **Real-time Updates**: Supabase subscriptions for live data updates

#### Component Structure
- **Pages**: Main route components in `src/pages/`
- **Components**: Reusable UI components organized by feature
- **Hooks**: Custom hooks for data fetching and business logic
- **Contexts**: Global state management for auth and projects

#### Database Schema
- **profiles**: User profile data
- **projects**: Project information
- **columns**: Kanban columns (To Do, In Progress, Done, etc.)
- **tasks**: Task items with assignments, tags, and function points
- **tags**: Task categorization system
- **task_tags**: Many-to-many relationship between tasks and tags

### Core Features
- **Kanban Board**: Drag-and-drop task management with column restrictions
- **Project Management**: Multi-project support with project switching
- **Team Collaboration**: User profiles and task assignments
- **Activity Tracking**: Task history and time tracking
- **Tag System**: Task categorization and filtering

### Important Implementation Notes

#### Task Movement Restrictions
- Completed tasks cannot be moved (see KanbanBoard.tsx:45-54)
- Business logic prevents moving tasks FROM completed columns

#### Authentication Flow
- Protected routes require authentication
- Profile creation happens automatically on first login
- Manual profile creation fallback exists for edge cases

#### Project Context
- Global project selection affects all Kanban operations
- Project switching triggers data refetch across components

#### Responsive Design
- Mobile-first approach with snap scrolling on mobile
- Column widths adjust based on screen size
- Grid layouts for team members and project summaries

## File Path Conventions

- Components use `@/` alias for `src/` directory
- UI components are in `src/components/ui/` (shadcn/ui)
- Feature components are organized by domain (auth, projects, etc.)
- Hooks are prefixed with `use` and grouped by feature
- Types are defined in `src/types/` with separate files for domains

## Development Workflow

1. Use React Query for all server state management
2. Create custom hooks for complex data operations
3. Follow existing patterns for component organization
4. Use TypeScript strictly - noImplicitAny is disabled but types should be explicit
5. All database operations go through Supabase client
6. Use existing UI components from shadcn/ui before creating new ones