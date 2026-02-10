# @tristanreid/trie-viz

Interactive D3 trie visualizer. Pass words, get an animated SVG tree diagram.

## Installation

```bash
npm install @tristanreid/trie-viz d3
```

## Quick Start

```typescript
import { TrieVisualizer } from '@tristanreid/trie-viz';

const viz = new TrieVisualizer(document.getElementById('container')!);

viz.addWord('cat');
viz.addWord('car');
viz.addWord('card');

// Or add multiple at once
viz.addWords(['the', 'there', 'their']);

// Animated insertion (500ms between each word)
await viz.addWordsAnimated(['New York', 'New Orleans', 'New Delhi']);
```

## Features

### Smooth animations

Adding or removing words triggers D3 enter/update/exit transitions. New nodes fade in, existing nodes slide to make room, removed nodes fade out.

### Three node types

- **Root**: small gray dot (the starting state)
- **Internal**: white circle with accent border (a character on the path, but no word ends here)
- **Terminal**: accent-filled circle with white label (a word ends here), plus a subtle outer ring

### Theme-aware colors

Colors are resolved in order: explicit options > CSS custom properties > defaults.

```typescript
// Explicit colors
const viz = new TrieVisualizer(el, {
  colors: { accent: '#0d9488', bg: '#0f172a', text: '#e2e8f0' }
});

// Or set CSS custom properties and they'll be picked up automatically
// --accent, --bg, --text, --text-muted, --border
```

### Path highlighting

```typescript
viz.addWords(['the', 'there', 'their']);
viz.highlightPath('the');    // highlights root → t → h → e
viz.clearHighlights();
```

### Stats

```typescript
console.log(viz.stats);
// { words: 3, nodes: 7 }
```

## API

### `new TrieVisualizer(container, options?)`

Create a visualizer inside the given DOM element.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `nodeSpacing` | `number` | `56` | Horizontal separation between siblings (px) |
| `levelHeight` | `number` | `72` | Vertical distance between levels (px) |
| `duration` | `number` | `400` | Animation duration (ms) |
| `maxHeight` | `number` | `600` | Maximum SVG height (px) |
| `nodeRadius` | `number` | `20` | Circle radius for nodes (px) |
| `colors` | `Partial<TrieColors>` | auto | Color overrides |

### Methods

| Method | Description |
|--------|-------------|
| `addWord(word)` | Add a word, animate. Returns `true` if new. |
| `addWords(words)` | Add multiple words, animate once. |
| `addWordsAnimated(words, delay?)` | Add words one at a time with delay. Returns Promise. |
| `clear()` | Remove all words and clear the SVG. |
| `highlightPath(prefix)` | Highlight the path from root to the given prefix. |
| `clearHighlights()` | Remove all highlights. |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `words` | `string[]` | Current word list |
| `stats` | `{ words, nodes }` | Trie statistics |

## Examples

### Vanilla HTML

```html
<div id="trie"></div>
<script type="module">
  import { TrieVisualizer } from '@tristanreid/trie-viz';
  const viz = new TrieVisualizer(document.getElementById('trie'));
  viz.addWords(['cat', 'car', 'card', 'cart', 'care']);
</script>
```

### React

```tsx
import { useEffect, useRef } from 'react';
import { TrieVisualizer } from '@tristanreid/trie-viz';

function TrieDemo({ words }: { words: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const vizRef = useRef<TrieVisualizer>();

  useEffect(() => {
    if (!ref.current) return;
    vizRef.current = new TrieVisualizer(ref.current);
    return () => { ref.current!.innerHTML = ''; };
  }, []);

  useEffect(() => {
    if (!vizRef.current) return;
    vizRef.current.clear();
    vizRef.current.addWords(words);
  }, [words]);

  return <div ref={ref} />;
}
```

## License

MIT
