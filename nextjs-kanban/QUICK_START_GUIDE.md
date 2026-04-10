# Quick Start Guide: Next.js Kanban Components

## 🚀 Getting Started

### Minimal Example: Using Existing Components

#### 1. Import & Use a Button
```tsx
import { Button } from '@/components/ui/button'

export function MyComponent() {
  return (
    <Button variant="default" size="sm">
      Click me
    </Button>
  )
}
```

#### 2. Create a Card with Content
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function MyCard() {
  return (
    <Card size="default">
      <CardHeader>
        <CardTitle>My Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Card content goes here</p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">Cancel</Button>
        <Button>Submit</Button>
      </CardFooter>
    </Card>
  )
}
```

#### 3. Use a Badge
```tsx
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

export function MyBadge() {
  return (
    <Badge variant="default">
      <Check className="w-3 h-3" />
      Status: Active
    </Badge>
  )
}
```

---

## 🎨 Component Variants & Options

### Button
```tsx
// Variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="default">Normal</Button>
<Button size="lg">Large</Button>
<Button size="icon">📎</Button>
<Button size="icon-sm">📎</Button>
```

### Badge
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="ghost">Ghost</Badge>
```

### Card Sizes
```tsx
<Card size="default">Normal card</Card>
<Card size="sm">Smaller card</Card>
```

---

## 📦 Creating a New Component

### Step 1: Create Component File
```tsx
// components/features/MyNewComponent.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface MyNewComponentProps {
  title?: string
  variant?: 'primary' | 'secondary'
  className?: string
}

export function MyNewComponent({
  title = 'Default Title',
  variant = 'primary',
  className,
}: MyNewComponentProps) {
  const [count, setCount] = useState(0)

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-6 rounded-2xl border border-gray-200',
        variant === 'primary' && 'bg-blue-50',
        variant === 'secondary' && 'bg-slate-50',
        className
      )}
    >
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600">Count: {count}</p>
      <Button
        onClick={() => setCount(c => c + 1)}
        variant="default"
        size="sm"
      >
        Increment
      </Button>
    </div>
  )
}
```

### Step 2: Use the Component
```tsx
import { MyNewComponent } from '@/components/features/MyNewComponent'

export default function Page() {
  return (
    <div className="p-10 space-y-6">
      <MyNewComponent title="My First Component" variant="primary" />
      <MyNewComponent title="Secondary Variant" variant="secondary" />
    </div>
  )
}
```

---

## 🔗 Using Hooks with Data

### Fetching Projects
```tsx
'use client'

import { useProjects } from '@/lib/hooks/useProjects'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export function ProjectList() {
  const { data: projects = [], isLoading, error } = useProjects()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading projects</div>

  return (
    <div className="space-y-4">
      {projects.map(project => (
        <Card key={project.id}>
          <CardHeader>
            <CardTitle>{project.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{project.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### Creating a Project
```tsx
'use client'

import { useState } from 'react'
import { useCreateProject } from '@/lib/hooks/useProjects'
import { Button } from '@/components/ui/button'

export function CreateProjectForm() {
  const [name, setName] = useState('')
  const createProject = useCreateProject()

  const handleSubmit = async () => {
    if (!name.trim()) return
    await createProject.mutateAsync({ name })
    setName('')
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name..."
        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
      />
      <Button
        onClick={handleSubmit}
        disabled={createProject.isPending || !name.trim()}
      >
        {createProject.isPending ? 'Creating...' : 'Create'}
      </Button>
    </div>
  )
}
```

---

## 🎯 Common Patterns

### Modal/Dialog
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function ModalExample() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Dialog Title</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600">Dialog content goes here</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setOpen(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

### Status Badge
```tsx
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS = {
  TODO: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-600',
  DONE: 'bg-green-100 text-green-600',
  BLOCKED: 'bg-red-100 text-red-600',
}

export function TaskStatusBadge({ status }) {
  return (
    <Badge variant="secondary" className={STATUS_COLORS[status]}>
      {status}
    </Badge>
  )
}
```

### Conditional Rendering
```tsx
import { cn } from '@/lib/utils'

export function ConditionalComponent({ isActive, error, className }) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        isActive && 'border-blue-300 bg-blue-50',
        error && 'border-red-300 bg-red-50',
        !isActive && !error && 'border-gray-200 bg-white',
        className
      )}
    >
      Content
    </div>
  )
}
```

---

## 🎨 Styling Cheat Sheet

### Common Tailwind Classes
```tsx
// Spacing
className="p-4"        // padding
className="m-2"        // margin
className="gap-3"      // gap (flex/grid)

// Typography
className="text-sm"    // text size
className="font-bold"  // font weight
className="text-gray-600" // text color

// Layout
className="flex"       // flexbox
className="grid"       // grid
className="space-y-4"  // vertical spacing

// Sizing
className="w-full"     // width 100%
className="h-10"       // height
className="min-h-screen" // minimum height

// Borders & Corners
className="border"     // 1px border
className="rounded-lg" // border radius
className="rounded-2xl" // larger radius

// Colors (use CSS variables)
className="bg-primary" // primary bg
className="text-foreground" // text color
className="border-border" // border color

// Hover & States
className="hover:bg-gray-100"
className="disabled:opacity-50"
className="focus:ring-2"
```

### Using CSS Variables
```tsx
// Define in globals.css
:root {
  --primary: oklch(0.205 0 0);    // Dark navy
  --destructive: oklch(0.577 0.245 27.325); // Red
}

// Use in components
<div className="bg-primary text-primary-foreground">
  Styled with CSS variables
</div>
```

---

## 📚 File Organization Best Practices

```
components/
├── ui/                    # Base components
│   ├── button.tsx
│   ├── card.tsx
│   └── badge.tsx
│
├── shared/                # Features used across pages
│   ├── ChatBubble.tsx
│   ├── AgentBadge.tsx
│   └── DiffViewer.tsx
│
├── features/              # Page-specific features
│   ├── home/
│   │   └── HomeClient.tsx
│   ├── kanban/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── TaskCard.tsx
│   └── planning/
│       ├── PlanningClient.tsx
│       └── ThreadList.tsx
│
└── layout/
    └── Navigation.tsx
```

---

## 🔍 Debugging Tips

### Check Component Props
```tsx
// Add console.log to see what props component receives
export function MyComponent(props) {
  console.log('Props:', props)
  return <div>...</div>
}
```

### Verify Styles Applied
```tsx
// Use browser DevTools to inspect:
// 1. Check if classes are present in HTML
// 2. Look for conflicting Tailwind classes
// 3. Check CSS variable values in DevTools

// Use data-slot attribute for easier selection
<div data-slot="my-component" className="...">
```

### Test Variants
```tsx
// Create a test page to see all variants
export function ButtonShowcase() {
  const variants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']
  return (
    <div className="space-y-4 p-8">
      {variants.map(v => (
        <Button key={v} variant={v as any}>
          {v}
        </Button>
      ))}
    </div>
  )
}
```

---

## ✅ Checklist: New Component

- [ ] File created in appropriate folder (`components/ui/`, `components/shared/`, or `components/features/`)
- [ ] Component accepts `className` prop for styling
- [ ] Using `cn()` to merge classes
- [ ] TypeScript interface defined for props
- [ ] `'use client'` directive if using hooks/state
- [ ] Exported from component file
- [ ] Imported in page/parent component
- [ ] All lucide-react icons imported separately
- [ ] No inline styles (use Tailwind)
- [ ] Responsive design considered (mobile-first)
- [ ] Dark mode compatibility (if needed)
- [ ] Accessibility attributes added (aria-labels, roles)

---

## 📖 Additional Resources

- **Tailwind CSS:** https://tailwindcss.com/docs
- **Base UI React:** https://base-ui.com/react/
- **Lucide Icons:** https://lucide.dev/
- **CVA (class-variance-authority):** https://cva.style/docs
- **React Query:** https://tanstack.com/query/latest
- **Next.js App Router:** https://nextjs.org/docs/app

---

## 🆘 Common Issues & Solutions

### Issue: Styles not applying
**Solution:** Check that:
1. You're using `cn()` function
2. Tailwind classes are spelled correctly
3. CSS variables are defined in globals.css
4. PostCSS is running (run `npm run build`)

### Issue: Component not rendering
**Solution:** Check that:
1. Component is exported correctly
2. File path import matches actual location
3. `'use client'` directive if needed
4. No TypeScript errors

### Issue: Modal/Popup not showing
**Solution:** Check that:
1. State is updating correctly
2. `fixed` and `z-50` classes are present
3. `inset-0` covers full screen
4. Background overlay is not preventing clicks

---

## 🚀 Next Steps

1. **Create a new page** in `app/(routes)/[feature]/page.tsx`
2. **Build client component** in `components/features/[feature]/`
3. **Use UI components** from `components/ui/`
4. **Connect to data** with React Query hooks
5. **Test and refine** styling and interactions

Good luck! 🎉
