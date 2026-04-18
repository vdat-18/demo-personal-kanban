/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Used to validate required environment variables before accepting requests.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/validations/schemas')
    try {
      validateEnv()
      console.log('✓ Environment variables validated')
    } catch (err) {
      // Log but don't crash — some envs (e.g. build time) may not have all vars
      console.warn('⚠️  Environment validation warning:', (err as Error).message)
    }
  }
}
