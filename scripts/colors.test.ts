// Run: node --test scripts/colors.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TASK_COLOR_PRESETS,
  areaColor,
  colorLabel,
  isHexColor,
  normalizeHexColor,
  parseColorValue,
  presetForHex,
  readableTextColor,
  resolveTaskColor,
  withAlpha,
} from '../src/colors.ts'

test('palette: unique ids and valid hex values', () => {
  assert.ok(TASK_COLOR_PRESETS.length >= 12)
  assert.equal(new Set(TASK_COLOR_PRESETS.map((p) => p.id)).size, TASK_COLOR_PRESETS.length)
  assert.equal(new Set(TASK_COLOR_PRESETS.map((p) => p.hex)).size, TASK_COLOR_PRESETS.length)
  for (const preset of TASK_COLOR_PRESETS) assert.equal(normalizeHexColor(preset.hex), preset.hex, preset.id)
})

test('hex normalisation', () => {
  assert.equal(isHexColor('#abc'), true)
  assert.equal(isHexColor('zzz'), false)
  assert.equal(isHexColor(undefined), false)
  assert.equal(normalizeHexColor('abc'), '#AABBCC')
  assert.equal(normalizeHexColor(' #3370ff '), '#3370FF')
  assert.equal(normalizeHexColor('#12345'), undefined)
})

test('parseColorValue: hex, ids, English and Chinese names', () => {
  assert.equal(parseColorValue('blue'), '#3370FF')
  assert.equal(parseColorValue('Red'), '#F54A45')
  assert.equal(parseColorValue('紫色'), '#7F3BF5')
  assert.equal(parseColorValue('gray'), '#8F959E')
  assert.equal(parseColorValue('#0f0'), '#00FF00')
  assert.equal(parseColorValue(''), undefined)
  assert.equal(parseColorValue(null), undefined)
  assert.equal(parseColorValue('chartreuse-ish'), undefined)
})

test('area colors are stable, mapped areas fixed, unknown areas never grey', () => {
  assert.equal(areaColor('Project'), '#3370FF')
  assert.equal(areaColor('Schedule'), '#FF8800')
  assert.equal(areaColor('Some new area'), areaColor('Some new area'))
  for (const name of ['a', 'b', 'Physics', '历史', '', 'x'.repeat(40)]) assert.notEqual(areaColor(name), '#8F959E', name)
})

test('resolveTaskColor: custom color wins, invalid custom falls back to area', () => {
  assert.equal(resolveTaskColor({ area: 'Project', color: '#f54a45' }), '#F54A45')
  assert.equal(resolveTaskColor({ area: 'Project', color: 'oops' }), '#3370FF')
  assert.equal(resolveTaskColor({ area: 'Project' }), '#3370FF')
})

test('labels, alpha, contrast', () => {
  assert.equal(presetForHex('#3370ff')?.id, 'blue')
  assert.equal(colorLabel('#3370FF'), 'Blue')
  assert.equal(colorLabel('#123456'), '#123456')
  assert.equal(colorLabel(undefined), 'Auto')
  assert.equal(withAlpha('#3370FF', 0.2), 'rgba(51, 112, 255, 0.2)')
  assert.equal(withAlpha('#3370FF', 5), 'rgba(51, 112, 255, 1)')
  assert.equal(readableTextColor('#FFC60A'), '#1F2329')
  assert.equal(readableTextColor('#3370FF'), '#FFFFFF')
})
