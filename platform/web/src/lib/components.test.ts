import { describe, it, expect } from 'vitest'
import { COMPONENT_KEYS, COMPONENT_LABELS, DEFAULT_COMPONENTS } from './components'

describe('component registry', () => {
  it('has 25 unique keys', () => {
    expect(COMPONENT_KEYS.length).toBe(25)
    expect(new Set(COMPONENT_KEYS).size).toBe(25)
  })

  it('labels every key', () => {
    for (const key of COMPONENT_KEYS) expect(COMPONENT_LABELS[key]).toBeTruthy()
  })

  it('per-vertical defaults reference only valid keys with no dupes', () => {
    const valid = new Set<string>(COMPONENT_KEYS)
    for (const [vertical, keys] of Object.entries(DEFAULT_COMPONENTS)) {
      expect(new Set(keys).size, `${vertical} has duplicate keys`).toBe(keys.length)
      for (const k of keys) expect(valid.has(k), `${vertical} references unknown key ${k}`).toBe(true)
    }
  })
})
