import type { CSSProperties } from 'react'

/** Typed helper for passing CSS custom properties (e.g. `--task-color`) through `style`. */
export function cssVars(vars: Record<`--${string}`, string | number | undefined>, base?: CSSProperties): CSSProperties {
  return { ...base, ...vars } as CSSProperties
}
