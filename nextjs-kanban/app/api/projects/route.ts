import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { ProjectService } from '@/lib/services/project.service'
import { createProjectSchema } from '@/lib/validations/schemas'

export const GET = withErrorHandler(async () => {
  const projects = await ProjectService.list()
  return NextResponse.json(projects)
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = createProjectSchema.parse(body)
  const project = await ProjectService.create(data)
  return NextResponse.json(project, { status: 201 })
})
