/** 本地搜索浮层：从已确认状态派生结果，不读取历史或远端数据。 */
import { useMemo, useRef, useState } from 'react';
import { Modal } from '@mantine/core';
import { IconArrowRight, IconExternalLink, IconFolder, IconSearch, IconStack2, IconX } from '@tabler/icons-react';
import type { LibraryDocument } from '../../../types/core.ts';
import type { BrowserSnapshot } from '../../../types/browser.ts';
import { Favicon, Tool } from './ui';
export interface SearchResult { key: string; kind: 'Spaces' | 'Collections' | 'Tabs' | 'Open tabs'; title: string; subtitle: string; spaceId?: string; collectionId?: string; url?: string; tabId?: number }
/** 支持分类、结果键盘导航、默认打开和集合定位两条独立路径。 */
export function Search({ library, snapshot, onOpen, onJump, onClose }: { library: LibraryDocument; snapshot?: BrowserSnapshot; onOpen(item: SearchResult): void; onJump(item: SearchResult): void; onClose(): void }) {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('All'); const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const results = useMemo(() => {
    const all: SearchResult[] = [];
    for (const s of library.spaces) {
      all.push({ key: s.id, kind: 'Spaces', title: s.name, subtitle: `${s.collections.length} collections`, spaceId: s.id });
      for (const c of s.collections) {
        all.push({ key: c.id, kind: 'Collections', title: c.name, subtitle: `${c.tabs.length} tabs · ${s.name}`, spaceId: s.id, collectionId: c.id });
        for (const t of c.tabs) all.push({ key: t.id, kind: 'Tabs', title: t.title, url: t.url, subtitle: `${c.name} · ${t.url}`, spaceId: s.id, collectionId: c.id });
      }
    }
    for (const w of snapshot?.windows || []) for (const t of w.tabs) all.push({ key: `live-${t.id}`, kind: 'Open tabs', title: t.title, url: t.url, subtitle: t.url, tabId: t.id });
    const q = query.trim().toLocaleLowerCase();
    return all.filter(r => (filter === 'All' || r.kind === filter) && (!q || `${r.title}\n${r.url || ''}`.toLocaleLowerCase().includes(q)));
  }, [library, snapshot, query, filter]);
  function move(delta: number) { const index = Math.max(0, Math.min(results.length - 1, selected + delta)); setSelected(index); refs.current[index]?.focus(); refs.current[index]?.scrollIntoView({ block: 'nearest' }); }
  return <Modal opened onClose={onClose} withCloseButton={false} size={760} padding={0} radius="lg" className="search-modal" centered>
    <div onKeyDown={e => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.target instanceof HTMLInputElement ? 0 : e.key === 'ArrowDown' ? 1 : -1); }
      if (e.key === 'ArrowRight' && !(e.target instanceof HTMLInputElement) && results[selected]?.collectionId) { e.preventDefault(); onJump(results[selected]); }
    }}>
      <div className="search-input"><IconSearch size={22} /><input autoFocus aria-label="Search tabs and collections" placeholder="Search anything…" value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && results[selected]) onOpen(results[selected]); }} /><button className="text-button" onClick={() => { setQuery(''); setSelected(0); }}>Clear</button><Tool label="Close search" onClick={onClose}><IconX size={19} /></Tool></div>
      <div className="search-filters" aria-label="Search categories">{['All', 'Spaces', 'Collections', 'Tabs', 'Open tabs'].map(f => <button key={f} aria-pressed={f === filter} className={f === filter ? 'active' : ''} onClick={() => { setFilter(f); setSelected(0); }}>{f}</button>)}</div>
      <div className="search-results"><div className="eyebrow" aria-live="polite">{results.length} {results.length === 1 ? 'match' : 'matches'}</div>
        {!results.length && <div className="empty-state"><IconSearch size={32} /><h3>No matches found</h3><p>Try another title, collection or website.</p></div>}
        {results.map((r, i) => <div key={r.key} className={`search-result ${i === selected ? 'selected' : ''}`}>
          <button ref={el => { refs.current[i] = el; }} className="result-open" onFocus={() => setSelected(i)} onClick={() => onOpen(r)}>
            {r.url ? <Favicon url={r.url} title={r.title} /> : r.kind === 'Spaces' ? <IconFolder size={22} /> : <IconStack2 size={22} />}
            <span><strong>{r.title}</strong><small>{r.subtitle}</small></span>
          </button>
          {r.kind === 'Collections' && <Tool label={`Go to ${r.title}`} onClick={() => onJump(r)}><IconArrowRight size={18} /></Tool>}
          <Tool label={`Open ${r.title}`} onClick={() => onOpen(r)}><IconExternalLink size={18} /></Tool>
        </div>)}
      </div><footer className="search-hints">↑ ↓ to navigate <span>↵ to open</span><span>→ to jump to collection</span><span>Tab to move between controls</span></footer>
    </div>
  </Modal>;
}
