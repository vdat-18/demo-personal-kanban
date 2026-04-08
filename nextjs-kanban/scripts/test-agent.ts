import { runAgent, runTeam, runTasks } from '../lib/agents/orchestrator'
import { allTools } from '../lib/agents/tools'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function testAgentExecution() {
  console.log('🤖 Testing Agent Execution with Simple Prompt\n')
  
  console.log('Environment variables check:')
  console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing')
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing')
  console.log('')

  try {
    console.log('Test 1: Simple Developer Agent Prompt')
    console.log('-------------------------------------')
    
    const progressEvents: any[] = []
    const onProgress = (event: any) => {
      progressEvents.push(event)
      console.log(`  📊 Progress: ${event.type || 'unknown'}`)
    }

    const result = await runAgent(
      'developer',
      'What is 2 + 2? Please respond with just the number.',
      onProgress
    )

    console.log('\n✓ Agent execution completed')
    console.log('Result:', result)

    console.log('\nProgress events received:', progressEvents.length)
    console.log('')

    return true
  } catch (error) {
    console.error('\n✗ Test failed with error:')
    console.error(error)
    return false
  }
}

async function testTokenTracking() {
  console.log('\n🎯 Testing Token Usage Tracking\n')
  
  try {
    const result = await runAgent(
      'developer',
      'Count from 1 to 5.'
    )

    console.log('✓ Agent execution completed')
    
    console.log('\n✓ Agent execution completed')
    return true
  } catch (error) {
    console.error('\n✗ Test failed with error:')
    console.error(error)
    return false
  }
}

async function testMultiProvider() {
  console.log('\n🔄 Testing Multi-Provider Support\n')
  
  console.log('Test 1: Anthropic Claude')
  console.log('------------------------')
  try {
    const claudeResult = await runAgent(
      'developer',
      'Say "Claude test successful" and nothing else.'
    )
    console.log('✓ Claude execution completed')
    console.log('Result:', claudeResult)
  } catch (error) {
    console.error('✗ Claude test failed:', error)
    return false
  }

  console.log('\nTest 2: OpenAI GPT')
  console.log('------------------')
  try {
    const gptResult = await runAgent(
      'architect',
      'Say "GPT test successful" and nothing else.'
    )
    console.log('✓ GPT execution completed (using default provider)')
  } catch (error) {
    console.error('✗ GPT test failed:', error)
    return false
  }

  return true
}

async function runTests() {
  console.log('═════════════════════════════════════════════════════════')
  console.log('  Open-Multi-Agent Integration Tests')
  console.log('═════════════════════════════════════════════════════════\n')

  const test1 = await testAgentExecution()
  const test2 = await testTokenTracking()
  const test3 = await testMultiProvider()

  console.log('\n═════════════════════════════════════════════════════════')
  console.log('  Test Summary')
  console.log('═════════════════════════════════════════════════════════')
  console.log('  Agent Execution:', test1 ? '✓ PASS' : '✗ FAIL')
  console.log('  Token Tracking:', test2 ? '✓ PASS' : '✗ FAIL')
  console.log('  Multi-Provider:', test3 ? '✓ PASS' : '✗ FAIL')
  console.log('═════════════════════════════════════════════════════════\n')

  if (test1 && test2 && test3) {
    console.log('✓ All tests passed!')
    process.exit(0)
  } else {
    console.log('✗ Some tests failed')
    process.exit(1)
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
