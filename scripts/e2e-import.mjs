// Drives headless Edge via CDP through the import wizard, commits 3 sample rows and checks they appear.
// Uses a throwaway Edge profile per run (deleted on exit) so the committed rows only live in that
// profile's localStorage. Note: under `vite dev` /api is not proxied, so nothing reaches data/*.json.
// Usage: node scripts/e2e-import.mjs [baseUrl]
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:5180'
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9333
mkdirSync('shots', { recursive: true })
const profileDir = `${process.env.TEMP}\\cdp-e2e-${Date.now()}`
const proc = spawn(edge, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, '--user-data-dir=' + profileDir, '--window-size=1440,900', 'about:blank'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let targets
for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break } catch { await sleep(250) } }
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let seq = 0; const pending = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.text }
const shot = async (name, w = 1440) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false })
  await sleep(600)
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`shots/${name}.png`, Buffer.from(r.result.data, 'base64'))
}
const clickText = (txt) => evalJs(`(() => { const b=[...document.querySelectorAll('button,[role=tab],.arco-tabs-header-title')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(txt)})); if(!b) return 'missing'; b.click(); return 'ok' })()`)

await send('Page.enable')
await send('Page.navigate', { url: `${base}/?view=planning&import=1` })
await sleep(3000)

const csv = [
  'Title,Area,Status,Priority,Start,Due,Hours,Tags,Owner',
  'Write chapter 2,Research,in progress,High,2026-10-12,2026-10-20,6,"thesis;writing",me',
  'Gym,Health,todo,low,13/10/2026,2026-10-13,1,,me',
  ',Research,todo,medium,2026-10-14,2026-10-15,2,,',
  'Bad date row,Career,done,urgent,2026-13-40,next week,abc,,',
].join('\n')
const out = {}
out.paste = await evalJs(`(() => { const t=document.querySelector('.importWizard textarea'); if(!t) return 'no textarea'; const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; set.call(t, ${JSON.stringify(csv)}); t.dispatchEvent(new Event('input',{bubbles:true})); return 'ok' })()`)
await sleep(300)
out.parse = await clickText('Parse pasted text')
await sleep(800)
out.footer = await evalJs(`document.querySelector('.importFooter')?.innerText`)
out.issues = await evalJs(`document.querySelector('.importIssues')?.innerText`)
out.mapping = await evalJs(`document.querySelector('.importMapping')?.innerText`)
await shot('e2e-preview')
await evalJs(`document.querySelector('.importWizard .importPreviewTable')?.scrollIntoView()`)
await shot('e2e-preview-table')
await shot('e2e-preview-narrow', 800)
out.specTab = await clickText('Data spec')
await sleep(600)
out.specLen = await evalJs(`document.querySelector('.importSpecEditor textarea, .importWizard textarea')?.value.length`)
await shot('e2e-spec')
out.specSave = await clickText('Validate & save')
await sleep(500)
out.specMsg = await evalJs(`document.querySelector('.importWizard .importError')?.innerText ?? document.querySelector('.arco-message')?.innerText ?? 'no error'`)
// commit the import and confirm the server received it
out.tabBack = await evalJs(`(() => { const t=[...document.querySelectorAll('.arco-modal .arco-tabs-header-title')].find(x=>x.textContent.trim()==='Import'); if(!t) return 'missing'; t.click(); return 'ok' })()`)
await sleep(500)
out.commit = await evalJs(`(() => { const b=[...document.querySelectorAll('.importFooter button')].find(x=>/^Import \\d+ task/.test(x.textContent.trim())); if(!b) return 'missing'; b.click(); return b.textContent.trim() })()`)
await sleep(2500)
out.modalOpen = await evalJs(`!!document.querySelector('.importWizard')?.offsetParent`)
out.newRows = await evalJs(`['Write chapter 2','Gym','Bad date row'].map(t => document.body.innerText.includes(t))`)
out.toast = await evalJs(`document.body.innerText.match(/Imported \\d+ tasks?[^\\n]*/)?.[0]`)
await shot('e2e-after')
await send('Page.navigate', { url: `${base}/?view=settings&settingsSection=data` })
await sleep(2500)
await shot('e2e-settings')
out.settingsBtn = await evalJs(`[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>/Import schedule|Restore backup/.test(t))`)
console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
await sleep(1000)
try { rmSync(profileDir, { recursive: true, force: true }) } catch { /* Edge may still hold locks */ }
process.exit(0)
