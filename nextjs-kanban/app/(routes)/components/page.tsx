'use client'

/**
 * Component Showcase — 4.7 Test component rendering in isolation
 *
 * This page renders every migrated UI component so you can visually verify
 * they display correctly in the Next.JS environment.  Visit /components in the
 * browser to inspect each one.
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AgentBadge } from '@/components/shared/AgentBadge'
import { ChatBubble, TypingIndicator } from '@/components/shared/ChatBubble'
import { DiffViewer } from '@/components/shared/DiffViewer'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-100">
        {title}
      </h2>
      <div className="flex flex-wrap gap-3 items-start">{children}</div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ComponentShowcase() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-black text-[#0a192f] mb-1">
          Component Showcase
        </h1>
        <p className="text-sm text-slate-500">
          Task 4.7 — All migrated UI components rendered in isolation for visual
          verification.
        </p>
      </div>

      {/* ── Button ─────────────────────────────────────────────────────────── */}
      <Section title="Button — all variants & sizes">
        <Button variant="default">Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button size="xs">XS</Button>
        <Button size="sm">SM</Button>
        <Button size="lg">LG</Button>
        <Button disabled>Disabled</Button>
      </Section>

      {/* ── Badge ──────────────────────────────────────────────────────────── */}
      <Section title="Badge — all variants">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="ghost">Ghost</Badge>
      </Section>

      {/* ── Avatar ─────────────────────────────────────────────────────────── */}
      <Section title="Avatar">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
          <AvatarFallback>SC</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>TP</AvatarFallback>
        </Avatar>
      </Section>

      {/* ── Progress ───────────────────────────────────────────────────────── */}
      <Section title="Progress">
        <div className="w-64 flex flex-col gap-3">
          <Progress value={0} />
          <Progress value={33} />
          <Progress value={66} />
          <Progress value={100} />
        </div>
      </Section>

      {/* ── Separator ──────────────────────────────────────────────────────── */}
      <Section title="Separator">
        <div className="w-64">
          <p className="text-sm text-slate-600 mb-2">Above</p>
          <Separator />
          <p className="text-sm text-slate-600 mt-2">Below</p>
        </div>
        <div className="h-12 flex items-center gap-4">
          <span className="text-sm">Left</span>
          <Separator orientation="vertical" />
          <span className="text-sm">Right</span>
        </div>
      </Section>

      {/* ── Card ───────────────────────────────────────────────────────────── */}
      <Section title="Card">
        <Card className="w-72">
          <CardHeader>
            <CardTitle>Sample Card</CardTitle>
            <CardDescription>
              A basic card migrated from the Vite frontend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Card content goes here. This verifies that shadcn/ui card
              components render correctly in Next.JS.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Action</Button>
            <Button size="sm" variant="outline">
              Cancel
            </Button>
          </CardFooter>
        </Card>

        <Card size="sm" className="w-72">
          <CardHeader>
            <CardTitle>Small Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Compact variant.</p>
          </CardContent>
        </Card>
      </Section>

      {/* ── ScrollArea ─────────────────────────────────────────────────────── */}
      <Section title="ScrollArea">
        <ScrollArea className="h-40 w-64 rounded-xl border border-slate-200 p-4">
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} className="text-sm text-slate-600 mb-2">
              Line {i + 1} of scrollable content
            </p>
          ))}
        </ScrollArea>
      </Section>

      {/* ── AgentBadge ─────────────────────────────────────────────────────── */}
      <Section title="AgentBadge (shared)">
        {['Planner Agent', 'Doer Agent', 'Reviewer Agent', 'Reporter Agent'].map(
          (agent) => (
            <AgentBadge key={agent} agentType={agent} />
          ),
        )}
        {['Planner Agent', 'Doer Agent'].map((agent) => (
          <AgentBadge key={`${agent}-md`} agentType={agent} size="md" />
        ))}
        <AgentBadge agentType="Planner Agent" showIcon={false} />
      </Section>

      {/* ── ChatBubble ─────────────────────────────────────────────────────── */}
      <Section title="ChatBubble + TypingIndicator (shared)">
        <div className="w-full max-w-xl">
          <ChatBubble
            sender="user"
            text="Can you analyse this task and break it into subtasks?"
          />
          <ChatBubble
            sender="agent"
            text="Sure! Here is a breakdown:\n\n1. **Research** the domain\n2. **Design** the solution\n3. **Implement** with tests\n4. **Review** the output"
            actionHint="I can create these subtasks automatically."
          />
          <ChatBubble sender="user" text="Go ahead!" />
          <TypingIndicator />
        </div>
      </Section>

      {/* ── DiffViewer ─────────────────────────────────────────────────────── */}
      <Section title="DiffViewer (shared)">
        <div className="w-full max-w-2xl">
          <DiffViewer
            oldText="The user needs a simple button to save their work. It should be placed in the top-right corner."
            newText="The user needs a prominent save button with keyboard shortcut (Ctrl+S) to save their work. It should be placed in the top-right corner with clear visual feedback on success."
            version={1}
          />
        </div>
      </Section>
    </div>
  )
}
