import { PrismaClient, TaskStatus, TaskPriority } from '../lib/generated/prisma'

const prisma = new (PrismaClient as any)()

async function main() {
  console.log('Seeding database...')

  // Create sample projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Personal Kanban MVP',
      description: 'Develop a personal kanban application with multi-agent AI support'
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Redesign the company website with modern technologies'
    },
  })

  // Create sample tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Setup project structure',
        description: 'Initialize the Next.JS project with TypeScript and Tailwind CSS',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        projectId: project1.id,
      },
      {
        title: 'Design database schema',
        description: 'Create Prisma schema for tasks, projects, and conversations',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        projectId: project1.id,
      },
      {
        title: 'Implement agent integration',
        description: 'Integrate open-multi-agent framework for AI-powered task orchestration',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.URGENT,
        projectId: project1.id,
      },
      {
        title: 'Create UI components',
        description: 'Build reusable UI components using shadcn/ui',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        projectId: project1.id,
      },
      {
        title: 'Research design systems',
        description: 'Research modern design patterns and best practices',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        projectId: project2.id,
      },
      {
        title: 'Create wireframes',
        description: 'Build high-fidelity wireframes for responsive design',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        projectId: project2.id,
      },
    ],
  })

  console.log('Database seeded successfully!')
  console.log(`Created ${2} projects and ${6} tasks`)

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
