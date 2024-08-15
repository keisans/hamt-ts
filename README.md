# HAMT (Hash Array Mapped Trie) TypeScript Library

This library provides an efficient implementation of a Hash Array Mapped Trie (HAMT) data structure in TypeScript. HAMT is a specialized trie data structure used to store key-value pairs, offering fast insertion, lookup, and deletion operations.

## Features

- Efficient key-value storage with O(log32 n) time complexity for basic operations
- Support for any hashable key type (default implementation uses strings)
- Immutable data structure operations
- Functional programming style using fp-ts

## Installation

```bash
npm install hamt-ts
```

## Usage

```typescript
import { HAMT, insert, lookup, remove } from 'hamt-ts'

// Create an empty HAMT
let hamt: HAMT<string, number> = { root: none, size: 0 }

// Insert key-value pairs
hamt = insert(hamt, 'key1', 100)
hamt = insert(hamt, 'key2', 200)

// Lookup values
const value1 = lookup(hamt, 'key1') // Some(100)
const value2 = lookup(hamt, 'key3') // None

// Remove a key-value pair
hamt = remove(hamt, 'key1')
```

## API

### Functions

- `insert<K extends Hashable, V>(hamt: HAMT<K, V>, key: K, value: V): HAMT<K, V>`
  Inserts a key-value pair into the HAMT.

- `lookup<K extends Hashable, V>(hamt: HAMT<K, V>, key: K): Option<V>`
  Looks up a value by key in the HAMT.

- `remove<K extends Hashable, V>(hamt: HAMT<K, V>, key: K): HAMT<K, V>`
  Removes a key-value pair from the HAMT.

## Implementation Details

This HAMT implementation uses a 32-way branching factor and employs bit manipulation techniques for efficient indexing. The trie structure consists of two types of nodes:

1. Leaf nodes: Store key-value pairs with matching hash prefixes
2. Internal nodes: Use a bitmap to efficiently index and store child nodes

The implementation leverages the `fp-ts` library for functional programming patterns, particularly for handling `Option` types.

## Performance

HAMT provides near-constant time complexity for basic operations:

- Insertion: O(log32 n)
- Lookup: O(log32 n)
- Deletion: O(log32 n)

Where n is the number of elements in the trie.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
