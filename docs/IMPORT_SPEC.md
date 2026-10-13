# CJ Board 日程导入口径 (Import Spec v1)

Entry points: **New → Import schedule…**, **Planning → Import schedule**, **Settings → Data → Import schedule**.

## Supported sources
| Format | Notes |
|---|---|
| `.xlsx` | Every non-empty sheet is offered; title rows above the header are skipped; date-formatted cells are read as dates. `.xls/.ods/.numbers` → save as .xlsx or CSV first. |
| `.csv` / `.tsv` / `.txt` | Delimiter auto-detected (`,` `\t` `;` `|`), UTF-8 BOM ok, quoted multi-line cells ok. |
| `.json` / `.ndjson` | `[{...}]`, `{ "tasks": [...] }` (also `data/items/records/rows/events/schedule/list`), single object, NDJSON, or `[[header...],[row...]]`. |
| Paste | Copy cells from Excel / Google Sheets, or paste CSV/JSON text. |

## Fields (column header = key, label, or any alias; case/space/punctuation-insensitive)
| key | required | accepted values |
|---|---|---|
| title | ✅ | text (标题/任务/日程/name/subject…) |
| area | | known area name, `Parent / Child`, or alias from `areaMap`; unknown → default area, original kept as a tag |
| status | | backlog/week/doing/review/done + aliases (待办, 进行中, 完成, todo, in progress…) |
| priority | | high/medium/low + P0–P3, 高/中/低, 1/2/3 |
| startDate / dueDate | | `2026-10-12`, `2026/10/12`, `2026年10月12日`, `20261012`, `12/10/2026` (day-first by default), `Oct 12, 2026`, `10月12日`, today/明天, Excel serial |
| reminderAt | | date + time (`2026-10-12 09:00`, `下午3点`) or only a time (uses due date) |
| reminderMins | | minutes before |
| estimateHours | | `2`, `1.5h`, `90min`, `1:30`, `1天` (× hoursPerDay) |
| progress | | `50`, `50%`, `0.5` |
| tags | | separated by `; , ， 、 |` |
| notes | | text; unmapped columns are appended here as `header: value` |
| checklist | | items separated by newline or `;`, `[x]` marks done |

Rules: rows without a title but with other data → error, skipped. Missing dates → each other / today. start > due → swapped. Duplicate = same title + due date (optional skip).

## Editing the spec
Open the wizard → **Data spec (editable)** tab. Edit JSON (aliases, `statusMap`, `priorityMap`, `areaMap`, `dayFirst`, separators, `hoursPerDay`, `defaults`), then **Validate & save** (stored in localStorage key `cjboard.importSpec.v1`). Invalid parts fall back to defaults; **Export spec / Load spec file** share it between machines.

Templates (Excel with a `Spec` reference sheet, CSV, JSON) are downloadable in the wizard. Run `npm test` for the parser tests.
