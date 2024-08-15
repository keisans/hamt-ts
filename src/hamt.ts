import { pipe } from 'fp-ts/function'
import { chain, fold, getOrElse, none, type Option, some } from 'fp-ts/Option'

type Hash = number
type Hashable = string

interface LeafNode<K extends Hashable, V> {
  type: 'Leaf'
  hash: Hash
  entries: Array<[K, V]>
}

interface InternalNode<K extends Hashable, V> {
  type: 'Internal'
  bitmap: number
  children: Array<HAMTNode<K, V>>
}

type HAMTNode<K extends Hashable, V> = LeafNode<K, V> | InternalNode<K, V>

export interface HAMT<K extends Hashable, V> {
  root: Option<HAMTNode<K, V>>
  size: number
}

const createLeaf = <K extends Hashable, V>(hash: Hash, key: K, value: V): LeafNode<K, V> => ({
  type: 'Leaf',
  hash,
  entries: [[key, value]]
})

const createInternal = <K extends Hashable, V>(
  bitmap: number,
  children: Array<HAMTNode<K, V>>
): InternalNode<K, V> => ({
  type: 'Internal',
  bitmap,
  children
})

const hash = <K extends Hashable>(key: K): Hash => {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  }

  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16

  return h >>> 0
}

const maskHash = (hash: Hash, shift: number): number => {
  return (hash >>> shift) & 0x1f
}

const bitpos = (hash: Hash, shift: number): number => {
  const masked = maskHash(hash, shift)
  return (1 << masked) >>> 0
}

const popcount = (x: number): number => {
  x -= (x >>> 1) & 0x55555555
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  x = (x + (x >>> 4)) & 0x0f0f0f0f
  x += x >>> 8
  x += x >>> 16
  return x & 0x3f
}

export const insert = <K extends Hashable, V>(hamt: HAMT<K, V>, key: K, value: V): HAMT<K, V> => {
  const keyHash = hash(key)
  const [updatedRoot, sizeChange] = pipe(
    hamt.root,
    fold(
      () => [some(createLeaf(keyHash, key, value)), 1] as const,
      (node) => {
        const [newNode, inserted] = updateNode(node, keyHash, 0, key, value)
        return [some(newNode), inserted ? 1 : 0] as const
      }
    )
  )

  return {
    root: updatedRoot,
    size: hamt.size + sizeChange
  }
}

const updateNode = <K extends Hashable, V>(
  node: HAMTNode<K, V>,
  hash: Hash,
  shift: number,
  key: K,
  value: V
): [HAMTNode<K, V>, boolean] => {
  if (node.type === 'Leaf') {
    return updateLeafNode(node, hash, shift, key, value)
  } else {
    return updateInternalNode(node, hash, shift, key, value)
  }
}

const updateLeafNode = <K extends Hashable, V>(
  node: LeafNode<K, V>,
  hash: Hash,
  shift: number,
  key: K,
  value: V
): [HAMTNode<K, V>, boolean] => {
  if (node.hash === hash) {
    const index = node.entries.findIndex(([k]) => k === key)
    if (index !== -1) {
      const newEntries = [...node.entries]
      newEntries[index] = [key, value]
      return [{ ...node, entries: newEntries }, false]
    } else {
      return [{ ...node, entries: [...node.entries, [key, value]] }, true]
    }
  }
  return [mergeLeaves(shift, node, hash, key, value), true]
}

const updateInternalNode = <K extends Hashable, V>(
  node: InternalNode<K, V>,
  hash: Hash,
  shift: number,
  key: K,
  value: V
): [HAMTNode<K, V>, boolean] => {
  const bit = bitpos(hash, shift)
  const idx = popcount(node.bitmap & (bit - 1))

  if ((node.bitmap & bit) !== 0) {
    const child = node.children[idx]
    const [newChild, inserted] = updateNode(child, hash, shift + 5, key, value)
    if (newChild === child) {
      return [node, false]
    }
    const newChildren = [...node.children]
    newChildren[idx] = newChild
    return [createInternal(node.bitmap, newChildren), inserted]
  }

  const newChild = createLeaf(hash, key, value)
  const newChildren = [...node.children.slice(0, idx), newChild, ...node.children.slice(idx)]
  return [createInternal(node.bitmap | bit, newChildren), true]
}

const mergeLeaves = <K extends Hashable, V>(
  shift: number,
  node: LeafNode<K, V>,
  hash: Hash,
  key: K,
  value: V
): InternalNode<K, V> => {
  const bit1 = bitpos(node.hash, shift)
  const bit2 = bitpos(hash, shift)

  if (bit1 === bit2) {
    const newNode = mergeLeaves(shift + 5, node, hash, key, value)
    return createInternal(bit1, [newNode])
  }

  const children = bit1 < bit2 ? [node, createLeaf(hash, key, value)] : [createLeaf(hash, key, value), node]
  return createInternal(bit1 | bit2, children)
}

export const lookup = <K extends Hashable, V>(hamt: HAMT<K, V>, key: K): Option<V> => {
  const keyHash = hash(key)
  return pipe(
    hamt.root,
    chain((node) => lookupNode(node, keyHash, 0, key))
  )
}

const lookupNode = <K extends Hashable, V>(node: HAMTNode<K, V>, hash: Hash, shift: number, key: K): Option<V> => {
  if (node.type === 'Leaf') {
    return lookupLeafNode(node, hash, key)
  } else {
    return lookupInternalNode(node, hash, shift, key)
  }
}

const lookupLeafNode = <K extends Hashable, V>(node: LeafNode<K, V>, hash: Hash, key: K): Option<V> => {
  if (node.hash === hash) {
    const entry = node.entries.find(([k]) => k === key)
    return entry ? some(entry[1]) : none
  }
  return none
}

const lookupInternalNode = <K extends Hashable, V>(
  node: InternalNode<K, V>,
  hash: Hash,
  shift: number,
  key: K
): Option<V> => {
  const bit = bitpos(hash, shift)
  if ((node.bitmap & bit) === 0) {
    return none
  }
  const idx = popcount(node.bitmap & (bit - 1))
  return lookupNode(node.children[idx], hash, shift + 5, key)
}

export const remove = <K extends Hashable, V>(hamt: HAMT<K, V>, key: K): HAMT<K, V> => {
  const keyHash = hash(key)
  const [updatedRoot, sizeChange] = pipe(
    hamt.root,
    fold(
      () => [none, 0] as const,
      (node) => {
        const [newNode, deleted] = removeNode(node, keyHash, 0, key)
        return [newNode, deleted ? -1 : 0] as const
      }
    )
  )

  return {
    root: updatedRoot,
    size: Math.max(0, hamt.size + sizeChange)
  }
}

const removeNode = <K extends Hashable, V>(
  node: HAMTNode<K, V>,
  hash: Hash,
  shift: number,
  key: K
): [Option<HAMTNode<K, V>>, boolean] => {
  if (node.type === 'Leaf') {
    return removeLeafNode(node, hash, key)
  } else {
    return removeInternalNode(node, hash, shift, key)
  }
}

const removeLeafNode = <K extends Hashable, V>(
  node: LeafNode<K, V>,
  hash: Hash,
  key: K
): [Option<HAMTNode<K, V>>, boolean] => {
  if (node.hash === hash) {
    const newEntries = node.entries.filter(([k]) => k !== key)
    if (newEntries.length === 0) {
      return [none, true]
    }
    if (newEntries.length === node.entries.length) {
      return [some(node), false]
    }
    return [some({ ...node, entries: newEntries }), true]
  }
  return [some(node), false]
}

const removeInternalNode = <K extends Hashable, V>(
  node: InternalNode<K, V>,
  hash: Hash,
  shift: number,
  key: K
): [Option<HAMTNode<K, V>>, boolean] => {
  const bit = bitpos(hash, shift)
  if ((node.bitmap & bit) === 0) {
    return [some(node), false]
  }
  const idx = popcount(node.bitmap & (bit - 1))
  const child = node.children[idx]
  const [newChild, deleted] = removeNode(child, hash, shift + 5, key)

  if (!deleted) {
    return [some(node), false]
  }

  if (newChild === none) {
    const newBitmap = node.bitmap & ~bit
    if (newBitmap === 0) {
      return [none, true]
    }
    const newChildren = [...node.children.slice(0, idx), ...node.children.slice(idx + 1)]
    return [some(createInternal(newBitmap, newChildren)), true]
  }

  const newChildren = [...node.children]
  newChildren[idx] = pipe(
    newChild,
    getOrElse(() => child) // Use the original child if newChild is None
  )
  return [some(createInternal(node.bitmap, newChildren)), true]
}
