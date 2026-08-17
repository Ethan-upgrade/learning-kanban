const { spawn } = require('child_process')
const path = require('path')

const root = path.resolve(__dirname, '..')
const codexPath = process.env.STUDYBOARD_CODEX_PATH || 'D:\\nodejs\\codex.cmd'
const codexHome = process.env.CODEX_HOME || 'D:\\codex-data'
const model = process.env.STUDYBOARD_CODEX_MODEL || ''

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

function clean(value) {
  return String(value || '').trim()
}

function buildPrompt(payload) {
  const task = payload.task || {}
  const messages = Array.isArray(payload.messages) ? payload.messages.slice(-10) : []
  const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
  const incomplete = tasks
    .filter((item) => item && item.status !== 'done')
    .slice(0, 8)
    .map((item) => `- [${item.area || 'Uncategorized'}] ${item.title || 'Untitled task'} (${item.status || 'unknown'}, progress ${item.progress || 0}%)`)
    .join('\n')
  const history = messages
    .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${clean(item.content)}`)
    .join('\n\n')

  return [
    'You are the embedded CJ Board learning tutor agent, running through the local Codex CLI.',
    '',
    'Response style:',
    '- Use English only.',
    '- Prioritize speed: give the conclusion first, then the steps.',
    '- If the user shares code, SQL, or an exercise, explain it concretely.',
    '- Do not pretend you executed code unless the user explicitly asked and execution actually happened.',
    '- End each answer with one smallest next practice step or one precise follow-up question.',
    '',
    `Consultation mode: ${payload.mode || 'coach'}`,
    '',
    'Current selected task:',
    `- Title: ${task.title || 'Not selected'}`,
    `- Area: ${task.area || 'Not selected'}`,
    `- Status: ${task.status || 'unknown'}`,
    `- Progress: ${task.progress ?? 0}%`,
    `- Notes: ${clean(task.notes) || 'None'}`,
    '',
    'Current incomplete task summary:',
    incomplete || 'None',
    '',
    'Recent conversation:',
    history || 'None',
    '',
    'Latest user question:',
    clean(payload.message),
  ].join('\n')
}

function runCodex(prompt) {
  return new Promise((resolve, reject) => {
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--sandbox',
      'read-only',
      '--color',
      'never',
      '-C',
      root,
    ]
    if (model) args.push('-m', model)
    args.push('-')

    const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', codexPath, ...args], {
      cwd: root,
      env: { ...process.env, CODEX_HOME: codexHome },
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Codex terminal agent timed out after 120 seconds'))
    }, 120_000)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim())
        return
      }
      reject(new Error(stderr.trim() || `Codex exited with code ${code}`))
    })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

async function main() {
  const raw = await readStdin()
  const payload = raw ? JSON.parse(raw) : {}
  const prompt = buildPrompt(payload)
  const answer = await runCodex(prompt)
  process.stdout.write(answer)
}

main().catch((error) => {
  process.stderr.write(String(error.stack || error.message || error))
  process.exit(1)
})
