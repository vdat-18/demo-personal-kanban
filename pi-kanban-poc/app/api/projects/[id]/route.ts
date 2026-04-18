import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { ProjectService } from '@/lib/services/project.service'
import { updateProjectSchema } from '@/lib/validations/schemas'

type Params = Promise<{ id: string }>

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  const project = await ProjectService.get(id)
  return NextResponse.json(project)
})

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  const body = await request.json()
  const data = updateProjectSchema.parse(body)
  const project = await ProjectService.update(id, data)
  return NextResponse.json(project)
})

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  await ProjectService.delete(id)
  return NextResponse.json({ success: true })
})
