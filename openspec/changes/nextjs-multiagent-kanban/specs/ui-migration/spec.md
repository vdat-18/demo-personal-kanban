## ADDED Requirements

### Requirement: UI components migration
The system SHALL migrate all UI components from the existing Vite frontend to Next.JS structure.

#### Scenario: Component files copied
- **WHEN** components are migrated
- **THEN** all component files from `frontend/src/components/` SHALL be copied to `nextjs-kanban/components/`
- **AND** component imports SHALL be updated for Next.JS conventions
- **AND** components SHALL render identically to the Vite version

#### Scenario: shadcn/ui compatibility
- **WHEN** shadcn/ui components are migrated
- **THEN** components SHALL maintain compatibility with shadcn/ui patterns
- **AND** Tailwind styles SHALL apply correctly
- **AND** component variants SHALL function as expected

### Requirement: Page routes migration
The system SHALL migrate all page routes from React Router to Next.JS App Router.

#### Scenario: Home page migration
- **WHEN** the Home page is migrated
- **THEN** it SHALL be accessible at the root path `/`
- **AND** it SHALL render at `app/page.tsx`
- **AND** all functionality SHALL match the Vite version

#### Scenario: Mission Control page migration
- **WHEN** the Mission Control page is migrated
- **THEN** it SHALL be accessible at `/mission-control/:id`
- **AND** it SHALL use dynamic routing at `app/(routes)/mission-control/[id]/page.tsx`
- **AND** the `id` parameter SHALL be accessible via params

#### Scenario: Planning Screen page migration
- **WHEN** the Planning Screen page is migrated
- **THEN** it SHALL be accessible at `/planning/:id?`
- **AND** it SHALL use dynamic routing with optional catch-all at `app/(routes)/planning/[id]/page.tsx`
- **AND** it SHALL work with and without the `id` parameter

#### Scenario: Task Chat page migration
- **WHEN** the Task Chat page is migrated
- **THEN** it SHALL be accessible at `/chat/:id`
- **AND** it SHALL use dynamic routing at `app/(routes)/chat/[id]/page.tsx`
- **AND** real-time agent communication SHALL work via SSE

#### Scenario: Task Summary page migration
- **WHEN** the Task Summary page is migrated
- **THEN** it SHALL be accessible at `/summary/:id`
- **AND** it SHALL use dynamic routing at `app/(routes)/summary/[id]/page.tsx`

#### Scenario: Directory page migration
- **WHEN** the Directory page is migrated
- **THEN** it SHALL be accessible at `/directory`
- **AND** it SHALL render at `app/(routes)/directory/page.tsx`

### Requirement: Layout migration
The system SHALL migrate the main layout structure from Vite to Next.JS.

#### Scenario: Main layout migration
- **WHEN** the MainLayout is migrated
- **THEN** it SHALL be converted to a Next.JS root layout at `app/layout.tsx`
- **AND** it SHALL include navigation elements
- **AND** it SHALL support nested layouts for route groups

#### Scenario: Shared layout components
- **WHEN** shared layout components are needed
- **THEN** they SHALL be placed in `components/layout/`
- **AND** they SHALL be reusable across different routes

### Requirement: State management migration
The system SHALL migrate state management from pure Zustand to hybrid Zustand + React Query approach.

#### Scenario: Server state with React Query
- **WHEN** server state is managed
- **THEN** tasks, projects, and conversations SHALL use React Query
- **AND** data fetching SHALL use useQuery hooks
- **AND** mutations SHALL use useMutation hooks
- **AND** caching and revalidation SHALL be configured appropriately

#### Scenario: Client state with Zustand
- **WHEN** client-only state is needed
- **THEN** UI-specific state (modals, temporary form data) SHALL use Zustand
- **AND** Zustand store SHALL be located in `lib/store/`
- **AND** store SHALL be compatible with Next.JS hydration

### Requirement: Styling consistency
The system SHALL maintain visual and styling consistency with the existing Vite frontend.

#### Scenario: Tailwind configuration match
- **WHEN** Tailwind is configured in Next.JS
- **THEN** the configuration SHALL match the Vite frontend's Tailwind config
- **AND** custom colors, fonts, and utilities SHALL be preserved
- **AND** responsive breakpoints SHALL match

#### Scenario: Font loading
- **WHEN** fonts are loaded
- **THEN** the same fonts from Vite frontend SHALL be used
- **AND** fonts SHALL be loaded via Next.JS `next/font` for optimization
- **AND** font loading SHALL not cause layout shift

### Requirement: Navigation migration
The system SHALL migrate navigation from React Router to Next.JS navigation.

#### Scenario: Link components
- **WHEN** navigation links are used
- **THEN** React Router `Link` SHALL be replaced with Next.JS `Link`
- **AND** programmatic navigation SHALL use `useRouter` from `next/navigation`
- **AND** route params SHALL be accessed via `useParams` hook

#### Scenario: Route guards
- **WHEN** route protection is needed
- **THEN** Next.JS middleware SHALL be used for route guards
- **AND** unauthorized access SHALL redirect appropriately

### Requirement: Error handling
The system SHALL implement error boundaries and error pages following Next.JS patterns.

#### Scenario: Error boundary
- **WHEN** a component error occurs
- **THEN** error.tsx files SHALL catch and display errors gracefully
- **AND** users SHALL see a user-friendly error message
- **AND** error recovery options SHALL be provided

#### Scenario: 404 page
- **WHEN** a non-existent route is accessed
- **THEN** not-found.tsx SHALL render a 404 page
- **AND** the page SHALL match the design system
- **AND** navigation back to home SHALL be provided

### Requirement: Loading states
The system SHALL implement loading states using Next.JS streaming and suspense.

#### Scenario: Loading UI
- **WHEN** a page is loading
- **THEN** loading.tsx files SHALL display loading indicators
- **AND** skeleton loaders SHALL match component structure
- **AND** streaming SHALL progressively reveal content

#### Scenario: Suspense boundaries
- **WHEN** async components are rendered
- **THEN** Suspense boundaries SHALL wrap data-dependent components
- **AND** fallback UI SHALL be provided
- **AND** streaming SHALL work for slow data fetching
