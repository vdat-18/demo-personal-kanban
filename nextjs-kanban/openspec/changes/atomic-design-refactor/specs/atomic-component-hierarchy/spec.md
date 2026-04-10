## ADDED Requirements

### Requirement: Atomic directory structure exists
The component tree SHALL be organized into exactly four atomic levels under `components/`: `atoms/`, `molecules/`, `organisms/`, and `templates/`. Each level SHALL contain an `index.ts` barrel file that re-exports all public components from that level.

#### Scenario: Fresh checkout directory listing
- **WHEN** a developer lists the contents of `components/`
- **THEN** the directories `atoms/`, `molecules/`, `organisms/`, and `templates/` SHALL exist, each containing at least one component file and an `index.ts`

#### Scenario: No orphan component files at root
- **WHEN** a developer lists files directly inside `components/` (non-recursively)
- **THEN** there SHALL be no `.tsx` component files outside the four atomic directories (only `index.ts` barrel and optionally a `ui/` re-export shim are allowed)

### Requirement: Atom classification rules
An atom SHALL be a single, indivisible UI element that does not compose other custom components. Atoms MAY use HTML elements, Tailwind classes, and base-ui primitives. Atoms SHALL NOT import other components from `molecules/`, `organisms/`, or `templates/`.

#### Scenario: Button atom has no custom component dependencies
- **WHEN** a developer inspects the import statements of any file in `atoms/`
- **THEN** there SHALL be no imports from `@/components/molecules`, `@/components/organisms`, or `@/components/templates`

#### Scenario: Existing shadcn primitives are classified as atoms
- **WHEN** the refactor is complete
- **THEN** `Button`, `Badge`, `Avatar`, `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Progress`, `ScrollArea`, `Separator`, and `Skeleton` SHALL all reside in `components/atoms/`

### Requirement: Molecule classification rules
A molecule SHALL compose two or more atoms (or HTML elements with atom-level complexity) into a small, focused unit with a single responsibility. Molecules SHALL NOT import from `organisms/` or `templates/`.

#### Scenario: ChatBubble molecule composes atoms
- **WHEN** a developer inspects `ChatBubble` in `molecules/`
- **THEN** it SHALL import at least one atom (or use HTML elements equivalent to atoms) and SHALL NOT import from `organisms/` or `templates/`

### Requirement: Organism classification rules
An organism SHALL compose multiple molecules and/or atoms into a self-contained, functional section of a page. Organisms MAY import from `atoms/` and `molecules/` but SHALL NOT import from `templates/`.

#### Scenario: KanbanBoard organism composes molecules
- **WHEN** a developer inspects `KanbanBoard` in `organisms/`
- **THEN** it SHALL import at least one molecule and SHALL NOT import from `templates/`

### Requirement: Template classification rules
A template SHALL define the page-level layout shell that composes organisms (and optionally molecules/atoms) into a complete page structure. Templates MAY import from all lower levels.

#### Scenario: MissionControlTemplate composes organisms
- **WHEN** a developer inspects the `MissionControlTemplate` in `templates/`
- **THEN** it SHALL import at least one organism from `organisms/`

### Requirement: Barrel export convention
Each atomic level SHALL have an `index.ts` file that uses named re-exports for every public component. Consumers SHALL import components via the level barrel (e.g., `import { Button } from '@/components/atoms'`).

#### Scenario: Importing an atom via barrel
- **WHEN** a developer writes `import { StatusPill } from '@/components/atoms'`
- **THEN** the import SHALL resolve successfully to the `StatusPill` component

### Requirement: Backward-compatible shadcn ui re-export shim
A `components/ui/index.ts` file SHALL exist and re-export all shadcn components from `atoms/` so that any tooling referencing `@/components/ui/*` continues to resolve.

#### Scenario: Legacy ui path still resolves
- **WHEN** an import references `@/components/ui/button`
- **THEN** it SHALL resolve to the same `Button` component now located in `atoms/button.tsx`
