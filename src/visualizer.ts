/**
 * D3 trie visualizer — renders a trie as an animated SVG tree diagram.
 *
 * Usage:
 *   import { TrieVisualizer } from '@tristanreid/trie-viz';
 *
 *   const viz = new TrieVisualizer(document.getElementById('container'), {
 *     colors: { accent: '#d94040' }
 *   });
 *   viz.addWord('cat');
 *   viz.addWords(['car', 'card', 'cart']);
 */

import * as d3 from 'd3';
import { Trie, TrieHierarchyNode } from './trie';

// ─── Types ──────────────────────────────────────────────────────────

export interface TrieVisualizerOptions {
  /** Horizontal separation between siblings (px). Default 56. */
  nodeSpacing?: number;
  /** Vertical distance between levels (px). Default 72. */
  levelHeight?: number;
  /** Animation duration (ms). Default 400. */
  duration?: number;
  /** Max SVG height (px). Default 600. */
  maxHeight?: number;
  /** Node radius (px). Default 20. */
  nodeRadius?: number;
  /** Color overrides. Falls back to CSS custom properties, then defaults. */
  colors?: Partial<TrieColors>;
}

export interface TrieColors {
  accent: string;
  bg: string;
  text: string;
  textMuted: string;
  border: string;
}

type HNode = d3.HierarchyPointNode<TrieHierarchyNode>;
type HLink = d3.HierarchyPointLink<TrieHierarchyNode>;

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_COLORS: TrieColors = {
  accent: '#d94040',
  bg: '#ffffff',
  text: '#1e2a3a',
  textMuted: '#8899aa',
  border: '#d0d8e4',
};

function resolveColors(overrides?: Partial<TrieColors>): TrieColors {
  // Try reading CSS custom properties, fall back to defaults
  let css: Partial<TrieColors> = {};
  if (typeof document !== 'undefined') {
    const cs = getComputedStyle(document.documentElement);
    const get = (prop: string) => cs.getPropertyValue(prop).trim() || undefined;
    css = {
      accent: get('--accent'),
      bg: get('--bg'),
      text: get('--text'),
      textMuted: get('--text-muted'),
      border: get('--border'),
    };
  }
  return { ...DEFAULT_COLORS, ...css, ...overrides };
}

// ─── Visualizer ─────────────────────────────────────────────────────

export class TrieVisualizer {
  private trie = new Trie();
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private colors: TrieColors;
  private nodeRadius: number;
  private rootRadius: number;
  private nodeSpacing: number;
  private levelHeight: number;
  private duration: number;
  private maxHeight: number;
  private padding = 36;

  constructor(container: HTMLElement, options?: TrieVisualizerOptions) {
    this.nodeSpacing = options?.nodeSpacing ?? 56;
    this.levelHeight = options?.levelHeight ?? 72;
    this.duration = options?.duration ?? 400;
    this.maxHeight = options?.maxHeight ?? 600;
    this.nodeRadius = options?.nodeRadius ?? 20;
    this.rootRadius = Math.round(this.nodeRadius / 2);
    this.colors = resolveColors(options?.colors);

    this.svg = d3
      .select(container)
      .append('svg')
      .attr('preserveAspectRatio', 'xMidYMin meet')
      .attr('width', '100%')
      .style('display', 'block')
      .style('margin', '0 auto')
      .style('overflow', 'visible');

    const g = this.svg.append('g');
    this.linkGroup = g.append('g');
    this.nodeGroup = g.append('g');
  }

  /** Add a single word and animate. */
  addWord(word: string): boolean {
    const added = this.trie.insert(word);
    if (added) this.render();
    return added;
  }

  /** Add multiple words and animate. */
  addWords(words: string[]): void {
    let changed = false;
    for (const word of words) {
      if (this.trie.insert(word)) changed = true;
    }
    if (changed) this.render();
  }

  /**
   * Add words one at a time with a delay between each (for demos).
   * Returns a promise that resolves when all words are added.
   */
  async addWordsAnimated(words: string[], delayMs = 500): Promise<void> {
    for (const word of words) {
      this.addWord(word);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  /** Remove all words and clear the visualization. */
  clear(): void {
    this.trie.clear();
    this.render();
  }

  /** Get current word list. */
  get words(): string[] {
    return this.trie.words;
  }

  /** Get current trie stats. */
  get stats(): { words: number; nodes: number } {
    return { words: this.trie.wordCount, nodes: this.trie.nodeCount };
  }

  /**
   * Highlight a path through the trie.
   * Pass a prefix string (e.g. "car") to highlight root→c→a→r.
   */
  highlightPath(path: string): void {
    this.clearHighlights();
    const pathIds = new Set<string>();
    let prefix = '';
    pathIds.add('__root__');
    for (const char of path) {
      prefix += char;
      pathIds.add(prefix);
    }
    this.nodeGroup
      .selectAll<SVGGElement, HNode>('g')
      .select('circle:nth-child(2)')
      .attr('stroke-width', (d) => pathIds.has(d.data.id) ? 4 : 2.5);
    this.linkGroup
      .selectAll<SVGPathElement, HLink>('path')
      .attr('stroke-width', (d) => pathIds.has(d.target.data.id) ? 4 : 2.5);
  }

  /** Clear all highlights. */
  clearHighlights(): void {
    this.nodeGroup.selectAll('circle').attr('stroke-width', 2.5);
    this.linkGroup.selectAll('path').attr('stroke-width', 2.5);
  }

  // ── Rendering ─────────────────────────────────────────────────────

  private render(): void {
    const data = this.trie.toHierarchy();
    const root = d3.hierarchy(data);
    const treeLayout = d3
      .tree<TrieHierarchyNode>()
      .nodeSize([this.nodeSpacing, this.levelHeight]);
    treeLayout(root);

    // Compute bounds
    let xMin = 0, xMax = 0, yMax = 0;
    root.each((d) => {
      const pd = d as HNode;
      xMin = Math.min(xMin, pd.x);
      xMax = Math.max(xMax, pd.x);
      yMax = Math.max(yMax, pd.y);
    });

    const pad = this.padding + this.nodeRadius;
    const svgW = xMax - xMin + 2 * pad;
    const svgH = yMax + 2 * pad;
    this.svg
      .attr('viewBox', `${xMin - pad} ${-pad} ${svgW} ${svgH}`)
      .attr('height', Math.min(svgH, this.maxHeight));

    const { accent, bg, text, textMuted, border } = this.colors;
    const nr = this.nodeRadius;
    const rr = this.rootRadius;
    const dur = this.duration;

    // ── Links
    const links = root.links() as HLink[];
    const linkPath = d3
      .linkVertical<HLink, HNode>()
      .x((d) => d.x)
      .y((d) => d.y);

    const linkSel = this.linkGroup
      .selectAll<SVGPathElement, HLink>('path')
      .data(links, (d) => d.target.data.id);

    linkSel.enter()
      .append('path')
      .attr('d', linkPath)
      .attr('fill', 'none')
      .attr('stroke', border)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0)
      .transition().duration(dur)
      .attr('opacity', 1);

    linkSel.transition().duration(dur).attr('d', linkPath);
    linkSel.exit().transition().duration(dur / 2).attr('opacity', 0).remove();

    // ── Nodes
    const nodes = root.descendants() as HNode[];
    const nodeSel = this.nodeGroup
      .selectAll<SVGGElement, HNode>('g')
      .data(nodes, (d) => d.data.id);

    const enterG = nodeSel.enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('opacity', 0);

    // Terminal ring
    enterG.filter((d) => d.data.isTerminal)
      .append('circle')
      .attr('r', nr + 5)
      .attr('fill', 'none')
      .attr('stroke', accent)
      .attr('stroke-width', 2)
      .attr('opacity', 0.3);

    // Main circle
    enterG.append('circle')
      .attr('r', (d) => d.data.id === '__root__' ? rr : nr)
      .attr('fill', (d) => {
        if (d.data.id === '__root__') return textMuted;
        return d.data.isTerminal ? accent : bg;
      })
      .attr('stroke', (d) => {
        if (d.data.id === '__root__') return textMuted;
        return accent;
      })
      .attr('stroke-width', (d) => d.data.id === '__root__' ? 2 : 2.5);

    // Label
    enterG.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', (d) => d.data.isTerminal ? '#fff' : text)
      .attr('font-family', "'SF Mono', 'Fira Code', monospace")
      .attr('font-size', '16px')
      .attr('font-weight', '700')
      .text((d) => d.data.char);

    // Merge enter + update
    const merged = nodeSel.merge(enterG as any);
    merged.transition().duration(dur)
      .attr('opacity', 1)
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    merged.select('circle:nth-child(2)')
      .transition().duration(dur)
      .attr('r', (d: any) => d.data.id === '__root__' ? rr : nr)
      .attr('fill', (d: any) => {
        if (d.data.id === '__root__') return textMuted;
        return d.data.isTerminal ? accent : bg;
      })
      .attr('stroke', (d: any) => d.data.id === '__root__' ? textMuted : accent);

    merged.select('text')
      .transition().duration(dur)
      .attr('fill', (d: any) => d.data.isTerminal ? '#fff' : text);

    // Add ring to newly terminal nodes
    merged.each(function (d: any) {
      const g = d3.select(this);
      const hasRing = g.selectAll('circle').size() > 1 ||
        (!g.select('circle:first-child').empty() && g.select('circle:first-child').attr('fill') === 'none');
      if (d.data.isTerminal && g.selectAll('circle').size() === 1) {
        g.insert('circle', 'circle')
          .attr('r', nr + 5)
          .attr('fill', 'none')
          .attr('stroke', accent)
          .attr('stroke-width', 2)
          .attr('opacity', 0)
          .transition().duration(dur)
          .attr('opacity', 0.3);
      }
    });

    // Exit
    nodeSel.exit().transition().duration(dur / 2).attr('opacity', 0).remove();
  }
}
