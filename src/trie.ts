/**
 * Lightweight trie data structure for the visualizer.
 * Stores words and exports a D3-compatible hierarchy.
 */

export interface TrieHierarchyNode {
  /** Unique ID — the prefix path (e.g. "ca" for root→c→a) */
  id: string;
  /** Character at this node (empty string for root) */
  char: string;
  /** Full prefix from root to this node */
  path: string;
  /** Whether a word terminates at this node */
  isTerminal: boolean;
  /** Words that end at this node */
  words: string[];
  /** Child nodes, sorted alphabetically */
  children: TrieHierarchyNode[];
}

interface InternalNode {
  children: Map<string, InternalNode>;
  isTerminal: boolean;
  words: string[];
}

function createNode(): InternalNode {
  return { children: new Map(), isTerminal: false, words: [] };
}

export class Trie {
  private root = createNode();
  private _words: string[] = [];

  /** Insert a word. Returns true if new, false if duplicate. */
  insert(word: string): boolean {
    if (!word) return false;
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, createNode());
      }
      node = node.children.get(char)!;
    }
    if (node.isTerminal) return false;
    node.isTerminal = true;
    node.words.push(word);
    this._words.push(word);
    return true;
  }

  /** All words currently in the trie. */
  get words(): string[] {
    return [...this._words];
  }

  get wordCount(): number {
    return this._words.length;
  }

  /** Total nodes including root. */
  get nodeCount(): number {
    let count = 0;
    const walk = (node: InternalNode) => {
      count++;
      for (const child of node.children.values()) walk(child);
    };
    walk(this.root);
    return count;
  }

  /** Export as a D3-compatible hierarchy. */
  toHierarchy(): TrieHierarchyNode {
    const convert = (
      node: InternalNode,
      char: string,
      path: string,
    ): TrieHierarchyNode => {
      const sortedKeys = [...node.children.keys()].sort();
      const children = sortedKeys.map((key) =>
        convert(node.children.get(key)!, key, path + key),
      );
      return {
        id: path || '__root__',
        char,
        path,
        isTerminal: node.isTerminal,
        words: [...node.words],
        children,
      };
    };
    return convert(this.root, '', '');
  }

  /** Remove all words and reset. */
  clear(): void {
    this.root = createNode();
    this._words = [];
  }
}
