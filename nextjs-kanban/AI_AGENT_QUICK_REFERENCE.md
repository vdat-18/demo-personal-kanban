# AI/Agent Features Quick Reference

## 🤖 Agent Roles

```typescript
// Three specialized agent roles
architect  → Planning & task generation
developer  → Implementation & task execution  
reviewer   → Quality assurance & review
```

## 🛠️ Available Agent Tools

| Tool | What It Does | Used By |
|------|-------------|---------|
| `db_query` | Query tasks/projects/conversations | All |
| `task_create` | Create new tasks | Developer, Architect |
| `task_update` | Modify task properties | Developer, Reviewer |
| `task_delete` | Delete tasks | Developer |
| `project_create` | Create new projects | Architect |
| `subtask_update` | Mark subtasks complete | Developer |

## 📍 Key Files by Feature

### Agent Infrastructure
- `lib/agents/configs.ts` - Agent role definitions & tool assignments
- `lib/agents/orchestrator.ts` - Multi-agent coordination (`runAgent`, `runTeam`, `runTasks`)
- `lib/agents/tools/index.ts` - Tool definitions
- `lib/services/agent.service.ts` - Main business logic layer

### Prompts
- `lib/agents/prompts/` - All prompt logic (918 lines)
- `lib/agents/prompts/builders/` - Prompt generators for different contexts
- `lib/agents/prompts/domains/` - Domain-specific prompts (SE, Marketing, Sales, Logistics)
- `lib/agents/prompts/role-labels.ts` - Role-specific system messages

### Streaming & Chat
- `lib/hooks/useAgentStream.ts` - Client-side SSE streaming hook
- `app/api/agents/stream/route.ts` - SSE streaming endpoint
- `lib/services/conversation.service.ts` - Save/load conversations

### Planning
- `app/(routes)/planning/` - Planning UI workspace
- `lib/services/planning.service.ts` - Planning thread management
- `lib/agents/prompts/builders/plan.ts` - 3-phase planning prompts
- `app/api/planning-threads/` - Planning APIs

### Task Execution
- `lib/hooks/useColumnAutoMode.ts` - Auto-mode column logic
- `lib/auto-mode/` - Column automation constants
- `app/api/tasks/auto-breakdown/route.ts` - Subtask generation

## 📊 Planning 3-Phase Flow

```
DISCOVERY 
  ↓ [PHASE:blueprint]
BLUEPRINT
  ↓ [PHASE:task_mapping]  
TASK_MAPPING
```

**Discovery**: Ask questions, gather context
**Blueprint**: Write structured project plan, get approval
**Task Mapping**: Break plan into executable tasks

## 🔄 API Endpoints

### Core Agent Endpoints
- `POST /api/agents/run` - Run single agent
- `POST /api/agents/stream` - Stream agent response (SSE)
- `POST /api/agents/team` - Run multiple agents
- `POST /api/agents/plan` - Run planning agent

### Planning Endpoints
- `POST /api/planning-threads` - Create thread
- `POST /api/planning-threads/[id]/messages` - Add message
- `POST /api/planning-threads/[id]/messages/[messageId]/mutations` - Approve/dismiss mutations

### Task Generation
- `POST /api/agents/generate-tasks` - Create tasks from planning
- `POST /api/tasks/auto-breakdown` - Generate subtasks

## 💾 Streaming Event Types

```typescript
{
  type: 'started',    // Stream started
  type: 'token',      // Received text delta
  type: 'progress',   // Tool usage or status update
  type: 'complete',   // Done (has tokenUsage)
  type: 'error'       // Something failed
}
```

## 🎯 Task Lifecycle with Agents

1. **Planning Phase** → Architect generates tasks via planning
2. **TODO Column** → Architect auto-plans each task (optionally)
3. **IN_PROGRESS Column** → Developer implements (optionally)
4. **IN_REVIEW Column** → Reviewer checks quality (optionally)
5. **DONE** → Terminal state

Auto mode in each column can trigger agents automatically.

## 🔌 Connecting New AI Providers

Current support:
- OpenAI (SDK ready)
- Anthropic (SDK v0.85.0 ready)
- Google Gemini (SDK ready)
- Ollama (via OLLAMA_BASE_URL)

To add: Set `AGENT_MODEL` env var or modify `lib/validations/schemas.ts` `getAgentModel()`

## 📝 Prompt Customization

**Domain-Specific**: 
- Modify `lib/agents/prompts/domains/[DOMAIN].ts`

**Phase-Specific**:
- Modify `lib/agents/prompts/builders/plan.ts` PHASE_INSTRUCTIONS

**Role-Specific**:
- Modify `lib/agents/prompts/role-labels.ts`

**Column Auto-Mode**:
- Modify `lib/auto-mode/constants.ts` DEFAULT_PROMPTS

## 🗄️ Database Models for AI

```prisma
Conversation {
  taskId, messages[], result, tokenUsage
}

PlanningThread {
  projectId, phase, visionDocument, messages[]
}

PlanningMessage {
  role, content, tokenUsage, mutationActions[]
}

MutationAction {
  approved | dismissed
}

Task {
  title, description, status, priority, subtasks[]
}

Subtask {
  title, completed, output
}
```

## 🎨 Domain Types

```typescript
type ProjectDomain = 
  | 'SOFTWARE_ENGINEERING'
  | 'MARKETING'
  | 'SALES'
  | 'LOGISTICS'
```

Each domain has specialized prompts that customize agent behavior.

## 🔒 Input Validation

All agent/planning inputs validated via Zod in `lib/validations/schemas.ts`:
- `chatStreamSchema` - Task chat input
- `planRequestSchema` - Planning input
- `runAgentSchema` - Direct agent prompt
- `teamAgentSchema` - Multi-agent coordination
- `generateTasksSchema` - Task generation input

## 📈 Token Usage Tracking

Conversations automatically track:
- Input tokens
- Output tokens

Accessible via `conversation.tokenUsage` or `/api/conversations/token-usage`

## 🚀 Quick Start: Add AI Chat to a Task

```typescript
// In React component
import { useAgentStream } from '@/lib/hooks/useAgentStream'

const { startStream, streamingContent, isStreaming } = useAgentStream({
  onComplete: (response) => console.log('Done:', response)
})

// Trigger stream
await startStream('developer', 'How should I implement this?', taskId)
```

## 🔗 Integration Checklist

- [ ] Database running (PostgreSQL)
- [ ] Environment variables set (API keys)
- [ ] `npm run db:generate` 
- [ ] `npm run db:migrate`
- [ ] Start `npm run dev`
- [ ] Test planning page (create project, start thread)
- [ ] Test mission-control (see kanban board)
- [ ] Test task chat (open task, chat with agent)

