import * as fc from 'fast-check'
import { none, some } from 'fp-ts/Option'
import { describe, expect, it, vi } from 'vitest'

import { type HAMT, insert, lookup, remove } from '../src/hamt'

describe('Hash Array Mapped Trie', () => {
  // Basic operations
  describe('Basic operations', () => {
    it('insert and lookup', () => {
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, 'key1', 1)
      hamt = insert(hamt, 'key2', 2)

      expect(lookup(hamt, 'key1')).toEqual(some(1))
      expect(lookup(hamt, 'key2')).toEqual(some(2))
      expect(lookup(hamt, 'key3')).toEqual(none)
    })

    it('overwrite existing key', () => {
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, 'key', 1)
      hamt = insert(hamt, 'key', 2)

      expect(lookup(hamt, 'key')).toEqual(some(2))
    })
  })

  // Hash collisions
  describe('Hash collisions', () => {
    it('handle hash collision', () => {
      // Mock the hash function to always return the same hash
      const originalHash = (globalThis as any).hash
      ;(globalThis as any).hash = vi.fn(() => 1)

      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, 'key1', 1)
      hamt = insert(hamt, 'key2', 2)

      expect(lookup(hamt, 'key1')).toEqual(some(1))
      expect(lookup(hamt, 'key2')).toEqual(some(2))

      // Restore the original hash function
      ;(globalThis as any).hash = originalHash
    })
  })

  describe('Delete operations', () => {
    it('delete existing key', () => {
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, 'key1', 1)
      hamt = insert(hamt, 'key2', 2)

      expect(hamt.size).toBe(2)
      expect(lookup(hamt, 'key1')).toEqual(some(1))
      expect(lookup(hamt, 'key2')).toEqual(some(2))

      hamt = remove(hamt, 'key1')

      expect(hamt.size).toBe(1)
      expect(lookup(hamt, 'key1')).toEqual(none)
      expect(lookup(hamt, 'key2')).toEqual(some(2))
    })

    it('delete non-existing key', () => {
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, 'key1', 1)

      expect(hamt.size).toBe(1)
      hamt = remove(hamt, 'key2')
      expect(hamt.size).toBe(1)
      expect(lookup(hamt, 'key1')).toEqual(some(1))
    })

    it('delete from empty HAMT', () => {
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = remove(hamt, 'key')
      expect(hamt.size).toBe(0)
      expect(hamt.root).toEqual(none)
    })

    it('delete with hash collision', () => {
      // Mock the hash function to always return the same hash
      const originalHash = (globalThis as any).hash
      ;(globalThis as any).hash = vi.fn(() => 1)

      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, 'key1', 1)
      hamt = insert(hamt, 'key2', 2)

      expect(hamt.size).toBe(2)
      hamt = remove(hamt, 'key1')

      expect(hamt.size).toBe(1)
      expect(lookup(hamt, 'key1')).toEqual(none)
      expect(lookup(hamt, 'key2')).toEqual(some(2))

      // Restore the original hash function
      ;(globalThis as any).hash = originalHash
    })

    it('delete all keys', () => {
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, 'key1', 1)
      hamt = insert(hamt, 'key2', 2)
      hamt = insert(hamt, 'key3', 3)

      expect(hamt.size).toBe(3)

      hamt = remove(hamt, 'key1')
      hamt = remove(hamt, 'key2')
      hamt = remove(hamt, 'key3')

      expect(hamt.size).toBe(0)
      expect(hamt.root).toEqual(none)
    })
  })

  describe('Property-based tests', () => {
    it('insert-lookup property', () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (key, value) => {
          let hamt: HAMT<string, number> = { root: none, size: 0 }
          hamt = insert(hamt, key, value)
          expect(lookup(hamt, key)).toEqual(some(value))
        })
      )
    })

    it('size property', () => {
      fc.assert(
        fc.property(fc.array(fc.tuple(fc.string(), fc.integer())), (entries) => {
          let hamt: HAMT<string, number> = { root: none, size: 0 }
          const entryMap = new Map(entries)
          entryMap.forEach((value, key) => {
            hamt = insert(hamt, key, value)
          })

          expect(hamt.size).toBe(entryMap.size)
        })
      )
    })
  })

  // Randomized tests
  describe('Randomized tests', () => {
    it('random inserts and lookups', () => {
      const numOperations = 1000
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      const entries: Map<string, number> = new Map()

      for (let i = 0; i < numOperations; i++) {
        const key = Math.random().toString(36).substring(7)
        const value = Math.floor(Math.random() * 1000)
        hamt = insert(hamt, key, value)
        entries.set(key, value)
      }

      entries.forEach((value, key) => {
        expect(lookup(hamt, key)).toEqual(some(value))
      })
    })
  })

  // Stress tests
  describe('Stress tests', () => {
    it('small number of inserts', () => {
      const numInserts = 23
      let hamt: HAMT<string, number> = { root: none, size: 0 }

      for (let i = 0; i < numInserts; i++) {
        hamt = insert(hamt, `key${i}`, i)
      }

      expect(hamt.size).toBe(numInserts)

      for (let i = 0; i < numInserts; i++) {
        const result = lookup(hamt, `key${i}`)
        expect(result).toEqual(some(i))
      }
    })

    it('medium-large number of inserts', () => {
      const numInserts = 200
      let hamt: HAMT<string, number> = { root: none, size: 0 }

      for (let i = 0; i < numInserts; i++) {
        hamt = insert(hamt, `key${i}`, i)
      }

      expect(hamt.size).toBe(numInserts)

      for (let i = 0; i < numInserts; i++) {
        const result = lookup(hamt, `key${i}`)
        expect(result).toEqual(some(i))
      }
    })

    it('large number of inserts', () => {
      const numInserts = 100000
      let hamt: HAMT<string, number> = { root: none, size: 0 }

      for (let i = 0; i < numInserts; i++) {
        hamt = insert(hamt, `key${i}`, i)
      }

      expect(hamt.size).toBe(numInserts)

      for (let i = 0; i < numInserts; i++) {
        const result = lookup(hamt, `key${i}`)
        expect(result).toEqual(some(i))
      }
    })

    it('insert and delete many keys', () => {
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      const numKeys = 10000

      // Insert keys
      for (let i = 0; i < numKeys; i++) {
        hamt = insert(hamt, `key${i}`, i)
      }

      expect(hamt.size).toBe(numKeys)

      // Delete odd-numbered keys
      for (let i = 1; i < numKeys; i += 2) {
        hamt = remove(hamt, `key${i}`)
      }

      expect(hamt.size).toBe(numKeys / 2)

      // Verify remaining keys
      for (let i = 0; i < numKeys; i++) {
        if (i % 2 === 0) {
          expect(lookup(hamt, `key${i}`)).toEqual(some(i))
        } else {
          expect(lookup(hamt, `key${i}`)).toEqual(none)
        }
      }
    })
  })

  // Edge case handling
  describe('Edge case handling', () => {
    it('empty string key', () => {
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, '', 42)
      expect(lookup(hamt, '')).toEqual(some(42))
    })

    it('very long key', () => {
      const longKey = 'a'.repeat(10000)
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      hamt = insert(hamt, longKey, 42)
      expect(lookup(hamt, longKey)).toEqual(some(42))
    })
  })

  // Structure sharing
  describe('Structure sharing', () => {
    it('shared structure after insert', () => {
      let hamt1: HAMT<string, number> = { root: none, size: 0 }
      hamt1 = insert(hamt1, 'key1', 1)
      const hamt2 = insert(hamt1, 'key2', 2)

      expect(lookup(hamt1, 'key1')).toEqual(some(1))
      expect(lookup(hamt1, 'key2')).toEqual(none)
      expect(lookup(hamt2, 'key1')).toEqual(some(1))
      expect(lookup(hamt2, 'key2')).toEqual(some(2))
    })
  })

  // Immutability
  describe('Immutability', () => {
    it('insert does not modify original HAMT', () => {
      let hamt1: HAMT<string, number> = { root: none, size: 0 }
      hamt1 = insert(hamt1, 'key', 1)
      const hamt2 = insert(hamt1, 'key', 2)

      expect(lookup(hamt1, 'key')).toEqual(some(1))
      expect(lookup(hamt2, 'key')).toEqual(some(2))
    })
  })

  // Performance
  describe('Performance', () => {
    it('insert performance', () => {
      const numInserts = 100000
      let hamt: HAMT<string, number> = { root: none, size: 0 }

      const start = performance.now()
      for (let i = 0; i < numInserts; i++) {
        hamt = insert(hamt, `key${i}`, i)
      }
      const end = performance.now()

      const durationMs = end - start
      console.log(`Insert performance: ${durationMs.toFixed(2)}ms for ${numInserts} inserts`)
      expect(durationMs).toBeLessThan(1000) // Adjust this threshold as needed
    })

    it('lookup performance', () => {
      const numLookups = 100000
      let hamt: HAMT<string, number> = { root: none, size: 0 }
      for (let i = 0; i < numLookups; i++) {
        hamt = insert(hamt, `key${i}`, i)
      }

      const start = performance.now()
      for (let i = 0; i < numLookups; i++) {
        lookup(hamt, `key${i}`)
      }
      const end = performance.now()

      const durationMs = end - start
      console.log(`Lookup performance: ${durationMs.toFixed(2)}ms for ${numLookups} lookups`)
      expect(durationMs).toBeLessThan(1000) // Adjust this threshold as needed
    })
  })
})
