const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync, spawn } = require('child_process')

const root = __dirname
const distDir = path.join(root, 'dist')
const dataDir = path.join(root, 'data')
const tasksFile = path.join(dataDir, 'tasks.json')
const chatFile = path.join(dataDir, 'chat.json')
const notesFile = path.join(dataDir, 'notes.json')
const projectsFile = path.join(dataDir, 'projects.json')
const baseRecordsFile = path.join(dataDir, 'base-records.json')
const port = Number(process.env.STUDYBOARD_PORT || 4173)
const startupShortcut = process.platform === 'win32' && process.env.APPDATA
  ? path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'CJ Board.lnk')
  : ''
const appExe = path.join(root, 'src-tauri', 'target', 'release', 'cj-board.exe')
const desktopIcon = path.join(root, 'CJBoardDesktop.ico')

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
}

fs.mkdirSync(dataDir, { recursive: true })

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
}

function psLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function runPowerShell(script) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
    { windowsHide: true },
  )
}

function getStartupStatus() {
  return {
    supported: process.platform === 'win32' && Boolean(startupShortcut),
    enabled: Boolean(startupShortcut && fs.existsSync(startupShortcut)),
    path: startupShortcut || null,
  }
}

function setStartupEnabled(enabled) {
  if (process.platform !== 'win32' || !startupShortcut) {
    throw new Error('Startup settings are only supported on Windows.')
  }
  if (enabled) {
    if (!fs.existsSync(appExe)) throw new Error(`CJ Board executable not found: ${appExe}`)
    fs.mkdirSync(path.dirname(startupShortcut), { recursive: true })
    runPowerShell([
      '$ErrorActionPreference = "Stop"',
      `$shortcutPath = ${psLiteral(startupShortcut)}`,
      `$targetPath = ${psLiteral(appExe)}`,
      `$workingDirectory = ${psLiteral(root)}`,
      `$iconPath = ${psLiteral(desktopIcon)}`,
      '$shell = New-Object -ComObject WScript.Shell',
      '$shortcut = $shell.CreateShortcut($shortcutPath)',
      '$shortcut.TargetPath = $targetPath',
      '$shortcut.WorkingDirectory = $workingDirectory',
      'if (Test-Path -LiteralPath $iconPath) { $shortcut.IconLocation = $iconPath }',
      '$shortcut.Description = "Start CJ Board on sign-in"',
      '$shortcut.Save()',
    ].join('\n'))
  } else if (fs.existsSync(startupShortcut)) {
    fs.unlinkSync(startupShortcut)
  }
  return getStartupStatus()
}

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': `http://127.0.0.1:${port}`,
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 10_000_000) {
        reject(new Error('Request too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function buildTutorReply({ message, mode, task, tasks }) {
  const text = String(message || '').trim()
  const area = task?.area || mode || 'Learning'
  const taskTitle = task?.title || 'Current learning task'

  if (!text) {
    return 'Tell me what you want to learn or paste code, SQL, or an error. I will answer in a "concept -> example -> practice -> review" structure.'
  }

  if (mode === 'explain' || /\b(code|error|bug|function|sql|query)\b/i.test(text)) {
    return [
      `Code explanation for "${taskTitle}".`,
      '',
      'Please paste the code or error. I will cover:',
      '1. What the code is trying to do.',
      '2. The key syntax and data flow.',
      '3. The important lines one by one.',
      '4. Likely bugs or edge cases.',
      '5. Time and space complexity when relevant.',
      '',
      'If you send code, keep the failing input or expected output with it.',
    ].join('\n')
  }

  if (mode === 'quiz' || /\b(quiz|test|practice|question)\b/i.test(text)) {
    return [
      `${area} practice mode starts now.`,
      '',
      `To finish "${taskTitle}", what is the next smallest action you can complete?`,
      '',
      'Answer with:',
      '- Your intended input',
      '- The algorithm, SQL, or reasoning path',
      '- The expected output or conclusion',
    ].join('\n')
  }

  if (mode === 'review' || /\b(review|progress|done|blocker|risk)\b/i.test(text)) {
    const done = (tasks || []).filter((item) => item.status === 'done').length
    const total = Array.isArray(tasks) ? tasks.length : 0
    return [
      `Current completion: ${done}/${total} tasks are done.`,
      '',
      `For "${taskTitle}", answer these review questions:`,
      '1. What did you finish today?',
      '2. What is blocked?',
      '3. What is the next concrete action?',
      '',
      'Then I will help tighten the execution plan.',
    ].join('\n')
  }

  return [
    `Working in ${area} mode. Current task: ${taskTitle}.`,
    '',
    `Your message: ${text}`,
    '',
    'Suggested next step:',
    '1. Ask a precise question, such as "Explain SQL JOINs with examples."',
    '2. Paste code, an error, or your current answer.',
    '3. I will break it down and give you a practice step.',
    '',
    'Supported topics: code, SQL, algorithms, databases, NLP, machine learning, and project planning.',
  ].join('\n')
}

function runTerminalTutor(payload) {
  const command =
    process.env.STUDYBOARD_CHAT_COMMAND ||
    `"${process.execPath}" "${path.join(root, 'scripts', 'study-agent.cjs')}"`

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: root,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: process.env,
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve({
        role: 'assistant',
        content: `The terminal learning agent timed out. Fallback reply:\n\n${buildTutorReply(payload)}`,
        provider: 'terminal-timeout',
      })
    }, 150_000)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && stdout.trim()) {
        resolve({
          role: 'assistant',
          content: stdout.trim(),
          provider: process.env.STUDYBOARD_CHAT_COMMAND ? 'terminal-custom'
            : 'terminal-codex',
        })
      } else {
        resolve({
          role: 'assistant',
          content: [
            'The terminal learning agent failed.',
            stderr.trim() ? `Error: ${stderr.trim()}` : `Exit code: ${code}`,
            '',
            'Fallback reply:',
            '',
            buildTutorReply(payload),
          ].join('\n'),
          provider: 'terminal-error',
        })
      }
    })
    child.stdin.write(JSON.stringify(payload, null, 2))
    child.stdin.end()
  })
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1')
  const requested = decodeURIComponent(url.pathname)
  const relativePath = requested === '/' ? 'index.html' : requested.slice(1)
  const filePath = path.normalize(path.join(distDir, relativePath))

  if (!filePath.startsWith(distDir)) {
    send(res, 403, 'Forbidden', 'text/plain; charset=utf-8')
    return
  }

  const target =
    fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath
      : path.join(distDir, 'index.html')
  const ext = path.extname(target).toLowerCase()
  const contentType = mimeTypes[ext] || 'application/octet-stream'
  fs.createReadStream(target)
    .on('error', () => send(res, 404, 'Not found', 'text/plain; charset=utf-8'))
    .once('open', () => {
      res.writeHead(200, { 'Content-Type': contentType })
    })
    .pipe(res)
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, '')
    return
  }

  if (req.url === '/api/tasks' && req.method === 'GET') {
    send(res, 200, JSON.stringify({ tasks: readJson(tasksFile, null) }))
    return
  }

  if (req.url === '/api/tasks' && req.method === 'PUT') {
    try {
      const body = await readBody(req)
      const payload = JSON.parse(body)
      if (!Array.isArray(payload.tasks)) {
        send(res, 400, JSON.stringify({ error: 'tasks must be an array' }))
        return
      }
      writeJson(tasksFile, payload.tasks)
      send(res, 200, JSON.stringify({ ok: true }))
    } catch (error) {
      send(res, 500, JSON.stringify({ error: String(error.message || error) }))
    }
    return
  }

  if (req.url === '/api/chat' && req.method === 'GET') {
    send(res, 200, JSON.stringify({ messages: readJson(chatFile, []) }))
    return
  }

  if (req.url === '/api/notes' && req.method === 'GET') {
    send(res, 200, JSON.stringify({ notes: readJson(notesFile, null) }))
    return
  }

  if (req.url === '/api/projects' && req.method === 'GET') {
    send(res, 200, JSON.stringify({ projects: readJson(projectsFile, null) }))
    return
  }

  if (req.url === '/api/base-records' && req.method === 'GET') {
    send(res, 200, JSON.stringify({ records: readJson(baseRecordsFile, null) }))
    return
  }

  if (req.url === '/api/base-records' && req.method === 'PUT') {
    try {
      const body = await readBody(req)
      const payload = JSON.parse(body)
      if (!Array.isArray(payload.records)) {
        send(res, 400, JSON.stringify({ error: 'records must be an array' }))
        return
      }
      writeJson(baseRecordsFile, payload.records)
      send(res, 200, JSON.stringify({ ok: true }))
    } catch (error) {
      send(res, 500, JSON.stringify({ error: String(error.message || error) }))
    }
    return
  }

  if (req.url === '/api/projects' && req.method === 'PUT') {
    try {
      const body = await readBody(req)
      const payload = JSON.parse(body)
      if (!Array.isArray(payload.projects)) {
        send(res, 400, JSON.stringify({ error: 'projects must be an array' }))
        return
      }
      writeJson(projectsFile, payload.projects)
      send(res, 200, JSON.stringify({ ok: true }))
    } catch (error) {
      send(res, 500, JSON.stringify({ error: String(error.message || error) }))
    }
    return
  }

  if (req.url === '/api/system/startup' && req.method === 'GET') {
    send(res, 200, JSON.stringify(getStartupStatus()))
    return
  }

  if (req.url === '/api/system/startup' && req.method === 'PUT') {
    try {
      const body = await readBody(req)
      const payload = JSON.parse(body || '{}')
      send(res, 200, JSON.stringify(setStartupEnabled(Boolean(payload.enabled))))
    } catch (error) {
      send(res, 500, JSON.stringify({ error: String(error.message || error) }))
    }
    return
  }

  if (req.url === '/api/notes' && req.method === 'PUT') {
    try {
      const body = await readBody(req)
      const payload = JSON.parse(body)
      if (!Array.isArray(payload.notes)) {
        send(res, 400, JSON.stringify({ error: 'notes must be an array' }))
        return
      }
      writeJson(notesFile, payload.notes)
      send(res, 200, JSON.stringify({ ok: true }))
    } catch (error) {
      send(res, 500, JSON.stringify({ error: String(error.message || error) }))
    }
    return
  }

  if (req.url === '/api/chat' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const payload = JSON.parse(body)
      const messages = readJson(chatFile, [])
      payload.messages = messages.slice(-12)

      const userMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: String(payload.message || ''),
        mode: payload.mode || 'coach',
        taskId: payload.task?.id || null,
        createdAt: new Date().toISOString(),
      }

      const terminalReply = await runTerminalTutor(payload)
      const reply = {
        ...terminalReply,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }

      const nextMessages = [...messages, userMessage, reply].slice(-200)
      writeJson(chatFile, nextMessages)
      send(
        res,
        200,
        JSON.stringify({
          message: nextMessages[nextMessages.length - 1],
          messages: nextMessages,
        }),
      )
    } catch (error) {
      send(res, 500, JSON.stringify({ error: String(error.message || error) }))
    }
    return
  }

  serveStatic(req, res)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`StudyBoard running at http://127.0.0.1:${port}`)
  console.log(`Data file: ${tasksFile}`)
})

