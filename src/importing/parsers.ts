// Parsers: turn an external file into a table of { headers, rows } of raw strings/numbers.
// Dependency-free: CSV/TSV/JSON in plain TS; XLSX via a tiny ZIP reader + DecompressionStream.

export type RawCell = string | number | boolean | null
export type RawRow = Record<string, RawCell>
export type RawTable = { headers: string[]; rows: RawRow[]; sheetName?: string; format: ImportFormat }
export type ImportFormat = 'csv' | 'tsv' | 'json' | 'xlsx'

export const detectFormat = (fileName: string, text?: string): ImportFormat | null => {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  if (ext === 'xlsx' || ext === 'xlsm') return 'xlsx'
  if (ext === 'json') return 'json'
  if (ext === 'tsv' || ext === 'tab') return 'tsv'
  if (ext === 'csv' || ext === 'txt') return 'csv'
  if (text !== undefined) {
    const trimmed = text.trimStart()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) return 'json'
    return 'csv'
  }
  return null
}

const stripBom = (text: string) => text.replace(/^\uFEFF/, '')

/** Pick the delimiter that splits the first lines most consistently. */
export const sniffDelimiter = (text: string): string => {
  const sample = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 10)
  let best = ','
  let bestScore = -1
  for (const candidate of [',', '\t', ';', '|']) {
    const counts = sample.map((line) => splitDelimited(line, candidate)[0]?.length ?? 0)
    if (!counts.length || counts[0] < 2) continue
    const consistent = counts.filter((count) => count === counts[0]).length
    const score = consistent * 100 + counts[0]
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

/** RFC 4180 parser: quoted fields, escaped quotes, newlines inside quotes, CRLF. */
export const splitDelimited = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"' && field === '') quoted = true
    else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Make headers unique and non-empty: "", "Tags", "Tags" -> "Column 1", "Tags", "Tags (2)". */
const uniqueHeaders = (headers: string[]) => {
  const seen = new Map<string, number>()
  return headers.map((header, index) => {
    const base = String(header ?? '').trim() || `Column ${index + 1}`
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
}

/** Header row = first row with ≥1 non-empty cell (skips title/blank rows above the table). */
export const tableFromMatrix = (matrix: RawCell[][], format: ImportFormat, sheetName?: string): RawTable => {
  const isBlank = (cells: RawCell[]) => cells.every((cell) => cell === null || String(cell).trim() === '')
  const filled = matrix.filter((cells) => !isBlank(cells))
  if (!filled.length) return { headers: [], rows: [], format, sheetName }
  // If the first non-blank row has just one cell but later rows are wider, treat it as a title.
  let headerIndex = 0
  const widthOf = (cells: RawCell[]) => cells.filter((cell) => cell !== null && String(cell).trim() !== '').length
  if (filled.length > 1 && widthOf(filled[0]) === 1 && widthOf(filled[1]) > 1) headerIndex = 1
  const headers = uniqueHeaders(filled[headerIndex].map((cell) => String(cell ?? '')))
  const rows = filled.slice(headerIndex + 1).map((cells) => {
    const row: RawRow = {}
    headers.forEach((header, index) => {
      const value = cells[index]
      row[header] = typeof value === 'string' ? value.trim() : value ?? null
    })
    return row
  })
  return { headers, rows, format, sheetName }
}

export const parseDelimited = (text: string, delimiter?: string): RawTable => {
  const clean = stripBom(text)
  const sep = delimiter || sniffDelimiter(clean)
  return tableFromMatrix(splitDelimited(clean, sep), sep === '\t' ? 'tsv' : 'csv')
}

const flattenValue = (value: unknown): RawCell => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    // checklist objects [{text, done}] -> "[x] a\n[ ] b"; plain arrays -> "a; b"
    if (value.every((item) => item && typeof item === 'object' && 'text' in item)) {
      return value.map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`).join('\n')
    }
    return value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join('; ')
  }
  return JSON.stringify(value)
}

/** Accepts: [ {...} ], { tasks: [...] }, { data|items|records|rows|events: [...] }, a single object, or NDJSON. */
export const parseJson = (text: string): RawTable => {
  const clean = stripBom(text).trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(clean)
  } catch {
    const lines = clean.split(/\r?\n/).filter((line) => line.trim())
    parsed = lines.map((line, index) => {
      try {
        return JSON.parse(line)
      } catch {
        throw new Error(`Invalid JSON (line ${index + 1})`)
      }
    })
  }
  let list: unknown = parsed
  if (list && !Array.isArray(list) && typeof list === 'object') {
    const obj = list as Record<string, unknown>
    const key = ['tasks', 'data', 'items', 'records', 'rows', 'events', 'schedule', 'list'].find((name) => Array.isArray(obj[name]))
    list = key ? obj[key] : [obj]
  }
  if (!Array.isArray(list)) throw new Error('JSON must be an array of objects or { "tasks": [...] }')
  // array of arrays -> first row is header
  if (list.length && list.every(Array.isArray)) return tableFromMatrix(list.map((row) => row.map(flattenValue)), 'json')
  const objects = list.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
  const headers: string[] = []
  for (const item of objects) for (const key of Object.keys(item)) if (!headers.includes(key)) headers.push(key)
  const rows = objects.map((item) => Object.fromEntries(headers.map((header) => [header, flattenValue(item[header])])) as RawRow)
  return { headers, rows, format: 'json' }
}

/* ---------------- XLSX (read) ---------------- */

type ZipEntry = { name: string; method: number; compressedSize: number; offset: number }

const readZipEntries = (bytes: Uint8Array): ZipEntry[] => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Not a valid .xlsx file (zip directory missing)')
  const count = view.getUint16(eocd + 10, true)
  let pointer = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) break
    const method = view.getUint16(pointer + 10, true)
    const compressedSize = view.getUint32(pointer + 20, true)
    const nameLength = view.getUint16(pointer + 28, true)
    const extraLength = view.getUint16(pointer + 30, true)
    const commentLength = view.getUint16(pointer + 32, true)
    const localOffset = view.getUint32(pointer + 42, true)
    const name = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength))
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    entries.push({ name, method, compressedSize, offset: localOffset + 30 + localNameLength + localExtraLength })
    pointer += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

const inflateRaw = async (data: Uint8Array): Promise<Uint8Array> => {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const readZipText = async (bytes: Uint8Array, entries: ZipEntry[], name: string): Promise<string | null> => {
  const entry = entries.find((item) => item.name === name)
  if (!entry) return null
  const raw = bytes.subarray(entry.offset, entry.offset + entry.compressedSize)
  const data = entry.method === 0 ? raw : entry.method === 8 ? await inflateRaw(raw) : null
  if (!data) throw new Error(`Unsupported compression in ${name}`)
  return new TextDecoder().decode(data)
}

const decodeXml = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')

const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join('')

const columnIndex = (ref: string) => {
  const letters = ref.replace(/\d+/g, '')
  let index = 0
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64)
  return index - 1
}

export type XlsxSheet = { name: string; matrix: RawCell[][] }

/** Built-in number formats that are dates (14–22, 45–47) plus any custom format containing y/m/d/h tokens. */
const isDateFormat = (id: number, code?: string) =>
  (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (!!code && /[ymdh]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]/g, '')))

export const readXlsx = async (buffer: ArrayBuffer): Promise<XlsxSheet[]> => {
  const bytes = new Uint8Array(buffer)
  const entries = readZipEntries(bytes)
  const workbook = await readZipText(bytes, entries, 'xl/workbook.xml')
  if (!workbook) throw new Error('Not a valid .xlsx file (workbook missing)')
  const rels = (await readZipText(bytes, entries, 'xl/_rels/workbook.xml.rels')) || ''
  const sharedXml = (await readZipText(bytes, entries, 'xl/sharedStrings.xml')) || ''
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]))
  const stylesXml = (await readZipText(bytes, entries, 'xl/styles.xml')) || ''
  const customFormats = new Map<number, string>()
  for (const m of stylesXml.matchAll(/<numFmt\s+numFmtId="(\d+)"\s+formatCode="([^"]*)"/g)) customFormats.set(Number(m[1]), decodeXml(m[2]))
  const cellXfs = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] || ''
  const dateStyles = [...cellXfs.matchAll(/<xf\b([^>]*)/g)].map((m) => {
    const id = Number(m[1].match(/numFmtId="(\d+)"/)?.[1] || 0)
    return isDateFormat(id, customFormats.get(id))
  })

  const relTargets = new Map<string, string>()
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/Id="([^"]+)"/)?.[1]
    const target = m[0].match(/Target="([^"]+)"/)?.[1]
    if (id && target) relTargets.set(id, target.replace(/^\/?xl\//, '').replace(/^\//, ''))
  }

  const sheets: XlsxSheet[] = []
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(m[0].match(/name="([^"]*)"/)?.[1] || `Sheet${sheets.length + 1}`)
    const rid = m[0].match(/r:id="([^"]+)"/)?.[1] || ''
    const target = relTargets.get(rid) || `worksheets/sheet${sheets.length + 1}.xml`
    const xml = await readZipText(bytes, entries, `xl/${target}`)
    if (!xml) continue
    const matrix: RawCell[][] = []
    for (const rowMatch of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowNumber = Number(rowMatch[0].match(/\br="(\d+)"/)?.[1] || matrix.length + 1)
      const cells: RawCell[] = []
      let fallback = 0
      for (const cell of (rowMatch[1] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cell[1]
        const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1]
        const col = ref ? columnIndex(ref) : fallback
        fallback = col + 1
        const type = attrs.match(/\bt="([^"]+)"/)?.[1]
        const style = Number(attrs.match(/\bs="(\d+)"/)?.[1] || 0)
        const body = cell[2] || ''
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
        let value: RawCell = null
        if (type === 's') value = v !== undefined ? shared[Number(v)] ?? '' : null
        else if (type === 'inlineStr') value = textOf(body)
        else if (type === 'str') value = v !== undefined ? decodeXml(v) : null
        else if (type === 'b') value = v === '1'
        else if (type === 'e') value = null
        else if (v !== undefined) {
          const num = Number(v)
          // Tag date-formatted serials so the normalizer knows they are dates, not hours/progress.
          value = dateStyles[style] && Number.isFinite(num) ? `@xlsdate:${num}` : num
        }
        cells[col] = value
      }
      matrix[rowNumber - 1] = Array.from({ length: cells.length }, (_, i) => cells[i] ?? null)
    }
    sheets.push({ name, matrix: Array.from({ length: matrix.length }, (_, i) => matrix[i] || []) })
  }
  if (!sheets.length) throw new Error('Workbook has no readable sheets')
  return sheets
}

/* ---------------- XLSX (write, used for templates) ---------------- */

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Minimal STORE-only zip writer. */
export const buildZip = (files: Array<{ name: string; content: string }>): Uint8Array => {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)
    const local = new Uint8Array(30 + name.length + data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(data, 30 + name.length)
    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    central.set(name, 46)
    locals.push(local)
    centrals.push(central)
    offset += local.length
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + centralSize + 22)
  let pos = 0
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const columnName = (index: number) => {
  let name = ''
  let n = index + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

/** Build an .xlsx with one or more sheets of plain strings (inline strings, no shared table). */
export const buildXlsx = (sheets: Array<{ name: string; rows: string[][] }>): Uint8Array => {
  const sheetXml = (rows: string[][]) =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
      .map((row, r) => `<row r="${r + 1}">${row
        .map((cell, c) => `<c r="${columnName(c)}${r + 1}" t="inlineStr"${r === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`)
        .join('')}</row>`)
      .join('')}</sheetData></worksheet>`
  const files = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((sheet, i) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
    },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: sheetXml(sheet.rows) })),
  ]
  return buildZip(files)
}

/* ---------------- entry point ---------------- */

export type ParsedFile = { tables: RawTable[]; format: ImportFormat }

/** Read any supported file. XLSX returns one table per non-empty sheet. */
export const parseImportFile = async (file: { name: string; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }): Promise<ParsedFile> => {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xls')) throw new Error('Legacy .xls is not supported — save as .xlsx or .csv first')
  if (lower.endsWith('.numbers') || lower.endsWith('.ods')) throw new Error('Export the sheet as .xlsx or .csv first')
  if (detectFormat(file.name) === 'xlsx') {
    const sheets = await readXlsx(await file.arrayBuffer())
    const tables = sheets.map((sheet) => tableFromMatrix(sheet.matrix, 'xlsx', sheet.name)).filter((table) => table.rows.length)
    if (!tables.length) throw new Error('Workbook has no data rows')
    return { tables, format: 'xlsx' }
  }
  const text = await file.text()
  const format = detectFormat(file.name, text) || 'csv'
  const table = format === 'json' ? parseJson(text) : parseDelimited(text, format === 'tsv' ? '\t' : undefined)
  if (!table.rows.length) throw new Error('No data rows found')
  return { tables: [table], format }
}

/** Parse pasted text (from Excel / Sheets copy, CSV or JSON). */
export const parsePastedText = (text: string): RawTable => {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Nothing to import')
  return trimmed.startsWith('[') || trimmed.startsWith('{') ? parseJson(trimmed) : parseDelimited(trimmed)
}
