/** 单机工作台编排：页面只提交领域命令，收藏写入和 Chrome 副作用交给后台。 */
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Alert, Button, MantineProvider, Menu } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconEdit, IconFolder, IconLayoutSidebar, IconLayoutSidebarRight, IconMinus, IconPlus, IconSearch, IconSettings, IconTrash } from '@tabler/icons-react';
import { browser } from 'wxt/browser';
import { useWorkspace } from '../../store/workspace.ts';
import { browserOperation, getSavePreview } from '../../services/core.ts';
import { findCollection } from '../../services/libraryModel.ts';
import { LIBRARY_KEY } from '../../utils/storage/index.ts';
import { onMessage } from '../../types/messaging.ts';
import type { Collection, LibraryCommand, SavedTab, SaveTarget } from '../../types/core.ts';
import type { BrowserOperation, OpenTarget, OperationReport, TabSource } from '../../types/browser.ts';
import { Board, type BoardActions } from './components/Board';
import { OpenTabs } from './components/OpenTabs';
import { ChoiceDialog, EditorDialog, type EditorConfig } from './components/Dialogs';
import { Search, type SearchResult } from './components/Search';
import { DropZone, MoreMenu, Tool, groupColors, type DragItem } from './components/ui';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

interface ChoiceConfig { key: number; title: string; description: string; left: string; right: string; rightDisabled?: boolean; onChoose(right: boolean, remember: boolean): Promise<void> }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please retry.'; }

function Workspace() {
  const state = useWorkspace();
  const { library, snapshot, spaceId } = state;
  const space = library?.spaces.find(s => s.id === spaceId);
  const [editor, setEditor] = useState<EditorConfig>(); const [choice, setChoice] = useState<ChoiceConfig>();
  const [search, setSearch] = useState(false); const [collapsed, setCollapsed] = useState(new Set<string>());
  const [drag, setDrag] = useState<DragItem>(); const [report, setReport] = useState<OperationReport>();
  const [working, setWorking] = useState(false); const [currentWindowId, setCurrentWindowId] = useState<number>();
  const [sidebar, setSidebar] = useState(() => window.innerWidth > 960); const [rightbar, setRightbar] = useState(true);
  const operationLock = useRef(false); const dialogId = useRef(0); const dragRef = useRef<DragItem | undefined>(undefined);
  const scrollFrame = useRef<number | undefined>(undefined); const scrollTarget = useRef<{ element: HTMLElement; speed: number } | undefined>(undefined);
  const busy = working || state.pending;

  useEffect(() => {
    const stop = onMessage('browser:changed', () => { void useWorkspace.getState().loadBrowser(); });
    const storageChanged = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && LIBRARY_KEY in changes) void useWorkspace.getState().loadLibrary(); };
    browser.storage.onChanged.addListener(storageChanged);
    const refresh = () => { if (!document.hidden) { void useWorkspace.getState().loadLibrary(); void useWorkspace.getState().loadBrowser(); } };
    document.addEventListener('visibilitychange', refresh);
    void state.loadLibrary(); void state.loadBrowser();
    void browser.windows.getCurrent().then(w => setCurrentWindowId(w.id)).catch(error => notifications.show({ color: 'red', message: errorMessage(error) }));
    return () => { stop(); browser.storage.onChanged.removeListener(storageChanged); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  function clearDrag() { dragRef.current = undefined; setDrag(undefined); scrollTarget.current = undefined; if (scrollFrame.current !== undefined) cancelAnimationFrame(scrollFrame.current); scrollFrame.current = undefined; }
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearDrag();
      if (event.isComposing || editor || choice || search) return;
      const input = event.target instanceof HTMLElement && (event.target.matches('input,textarea,select') || event.target.isContentEditable);
      if ((!input && event.key === '/') || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) { event.preventDefault(); if (library) setSearch(true); }
    };
    window.addEventListener('keydown', keys); window.addEventListener('dragend', clearDrag);
    return () => { window.removeEventListener('keydown', keys); window.removeEventListener('dragend', clearDrag); };
  }, [editor, choice, search, library]);
  useEffect(() => () => clearDrag(), []);

  function run(task: () => Promise<unknown>) { void task().catch(error => notifications.show({ color: 'red', title: 'Could not complete action', message: errorMessage(error), autoClose: false })); }
  const mutate = (command: LibraryCommand) => state.mutate(command);
  function form(config: Omit<EditorConfig, 'key'>) { setEditor({ ...config, key: ++dialogId.current }); }
  function nameForm(title: string, initial: string, submit: (name: string) => Promise<void>) { form({ title, fields: [{ key: 'name', label: 'Name', value: initial }], onSubmit: values => submit(values.name || '') }); }
  function confirm(title: string, description: string, submit: () => Promise<void>, confirmLabel = 'Delete') { form({ title, description, fields: [], danger: confirmLabel === 'Delete', confirmLabel, onSubmit: submit }); }
  async function perform(operation: BrowserOperation) {
    if (operationLock.current) throw new Error('Please wait for the current browser operation.');
    operationLock.current = true; setWorking(true);
    try {
      const result = await browserOperation(operation); setReport(result.failures.length ? result : undefined);
      if (!result.failures.length && ['save', 'open'].includes(operation.type)) notifications.show({ message: result.message, color: 'pink' });
    } finally { operationLock.current = false; setWorking(false); await Promise.all([state.loadLibrary(), state.loadBrowser()]); }
  }
  function windowTarget(): OpenTarget { if (currentWindowId === undefined) throw new Error('The current browser window is not available. Refresh this workspace.'); return { windowId: currentWindowId }; }
  async function save(source: TabSource, targetOverride?: SaveTarget) {
    if (!spaceId) throw new Error('Create a space before saving tabs.');
    const preview = await getSavePreview(source);
    const target: SaveTarget = targetOverride || { spaceId, name: preview.name, ...(preview.groupColor ? { groupColor: preview.groupColor } : {}) };
    const label = 'collectionId' in target ? findCollection(library!, target.collectionId).collection.name : target.name;
    const submit = (close: boolean, remember: boolean) => perform({ type: 'save', preview, target, disposition: close ? 'close' : 'keep', remember });
    const preference = library!.preferences.saveDisposition;
    if (preference !== 'ask') { await submit(preference === 'close', false); return; }
    setChoice({ key: ++dialogId.current, title: 'Save session?', description: `Save ${preview.tabs.length} ${preview.tabs.length === 1 ? 'tab' : 'tabs'} into ${label}? You can reopen them anytime.`, left: 'Save & Keep Tabs Open', right: 'Save & Close Tabs', onChoose: submit });
  }
  function openCollection(collection: Collection) {
    if (currentWindowId === undefined) { notifications.show({ color: 'red', message: 'The current browser window is unavailable. Refresh this workspace.' }); return; }
    const target: OpenTarget = { windowId: currentWindowId };
    const submit = (group: boolean, remember: boolean) => perform({ type: 'open', items: collection.tabs, target, ...(group ? { group: { title: collection.name, color: collection.groupColor || 'grey' } } : {}), ...(remember ? { remember: group ? 'group' as const : 'tabs' as const } : {}) });
    const mode = library!.preferences.restoreMode;
    if (mode !== 'ask') { run(() => submit(mode === 'group', false)); return; }
    setChoice({ key: ++dialogId.current, title: 'Open collection?', description: `Open ${collection.tabs.length} tabs from ${collection.name}${snapshot?.groupsAvailable === false ? '? Tab groups are currently unavailable.' : ' as a Chrome tab group?'}`, left: 'Open Tabs', right: 'Open as Group', rightDisabled: snapshot?.groupsAvailable === false, onChoose: submit });
  }
  function openTab(tab: SavedTab) { run(() => perform({ type: 'open', items: [tab], target: windowTarget(), activate: true })); }
  function startDrag(event: DragEvent, item: DragItem) {
    if (busy) { event.preventDefault(); return; }
    event.dataTransfer.setData('application/x-tab-cove', JSON.stringify(item)); event.dataTransfer.effectAllowed = 'move'; dragRef.current = item; setDrag(item);
  }
  function takeDrag(): DragItem | undefined { const item = dragRef.current; clearDrag(); return item; }
  function getSavedTab(id: string) { for (const s of library!.spaces) for (const c of s.collections) { const t = c.tabs.find(t => t.id === id); if (t) return t; } throw new Error('This saved tab no longer exists.'); }
  function getLiveTab(id: number) { const tab = snapshot?.windows.flatMap(w => w.tabs).find(t => t.id === id); if (!tab) throw new Error('This browser tab no longer exists. Refresh and try again.'); return tab; }
  function dropCollection(collectionId: string, beforeId?: string) {
    const item = takeDrag(); if (!item) return;
    run(async () => {
      if (item.kind === 'tab') await mutate({ type: 'tab:move', id: item.id, collectionId, beforeId });
      if (item.kind === 'live') { const tab = getLiveTab(item.id); await save({ windowId: tab.windowId, tabId: tab.id }, { collectionId, beforeId }); }
    });
  }
  function dropGap(beforeId?: string) {
    const item = takeDrag(); if (!item || !space) return;
    if (item.kind === 'collection') { run(() => mutate({ type: 'collection:move', id: item.id, spaceId: space.id, beforeId })); return; }
    nameForm('New collection', '', async name => {
      if (item.kind === 'tab') await mutate({ type: 'tab:newCollection', id: item.id, spaceId: space.id, name, beforeId });
      else if (item.kind === 'live') { const tab = getLiveTab(item.id); await save({ windowId: tab.windowId, tabId: tab.id }, { spaceId: space.id, name, beforeId }); }
    });
  }
  function dropBrowser(target: OpenTarget) {
    const item = takeDrag(); if (!item) return;
    run(async () => {
      if (item.kind === 'live') await perform({ type: 'move', tabId: item.id, target });
      else if (item.kind === 'tab') await perform({ type: 'open', items: [getSavedTab(item.id)], target });
    });
  }
  function autoScroll(event: DragEvent) {
    if (!dragRef.current) return;
    const element = (event.target as HTMLElement).closest<HTMLElement>('[data-scroll-panel]');
    if (!element) { scrollTarget.current = undefined; return; }
    const bounds = element.getBoundingClientRect();
    const speed = event.clientY < bounds.top + 60 ? -12 : event.clientY > bounds.bottom - 60 ? 12 : 0;
    scrollTarget.current = speed ? { element, speed } : undefined;
    if (scrollFrame.current !== undefined) return;
    function step() { const target = scrollTarget.current; if (!target || !dragRef.current) { scrollFrame.current = undefined; return; } target.element.scrollTop += target.speed; scrollFrame.current = requestAnimationFrame(step); }
    scrollFrame.current = requestAnimationFrame(step);
  }
  function settings() { if (!library) return; form({ title: 'Preferences', description: 'Your library stays in this browser. Removing the extension or clearing its data deletes the library.', fields: [
    { key: 'save', label: 'After saving tabs', value: library.preferences.saveDisposition, options: [{ value: 'ask', label: 'Ask every time' }, { value: 'keep', label: 'Keep tabs open' }, { value: 'close', label: 'Close saved tabs' }] },
    { key: 'restore', label: 'When opening collections', value: library.preferences.restoreMode, options: [{ value: 'ask', label: 'Ask every time' }, { value: 'tabs', label: 'Open ordinary tabs' }, { value: 'group', label: 'Open as a Chrome group' }] },
  ], onSubmit: v => mutate({ type: 'preferences', patch: { saveDisposition: v.save as 'ask' | 'keep' | 'close', restoreMode: v.restore as 'ask' | 'tabs' | 'group' } }) }); }
  function newSpace() { nameForm('Create space', '', async name => { await mutate({ type: 'space:create', name }); const spaces = useWorkspace.getState().library?.spaces; if (spaces?.length) state.selectSpace(spaces[spaces.length - 1]!.id); }); }
  function jump(result: SearchResult) { if (!result.spaceId) return; state.selectSpace(result.spaceId); setSearch(false); if (result.collectionId) { setCollapsed(prev => { const next = new Set(prev); next.delete(result.collectionId!); return next; }); requestAnimationFrame(() => document.getElementById(`collection-${result.collectionId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })); } }
  function searchOpen(result: SearchResult) {
    setSearch(false);
    if (result.kind === 'Spaces') jump(result);
    else if (result.kind === 'Collections') openCollection(findCollection(library!, result.collectionId!).collection);
    else if (result.kind === 'Tabs') openTab(getSavedTab(result.key));
    else run(() => perform({ type: 'focus', tabId: result.tabId! }));
  }
  const boardActions: BoardActions = {
    create: beforeId => nameForm('New collection', '', name => mutate({ type: 'collection:create', spaceId: space!.id, name, beforeId })),
    rename: c => nameForm('Rename collection', c.name, name => mutate({ type: 'collection:rename', id: c.id, name })),
    remove: c => confirm('Delete collection?', `Delete ${c.name} and its ${c.tabs.length} saved tabs? Open browser tabs will stay open.`, () => mutate({ type: 'collection:delete', id: c.id })),
    open: openCollection,
    save: c => run(() => save({ windowId: windowTarget().windowId }, { collectionId: c.id })),
    move: c => form({ title: 'Move collection', fields: [{ key: 'space', label: 'Destination space', value: space!.id, options: library!.spaces.map(s => ({ value: s.id, label: s.name })) }], onSubmit: v => mutate({ type: 'collection:move', id: c.id, spaceId: v.space! }) }),
    reorder: (c, beforeId) => run(() => mutate({ type: 'collection:move', id: c.id, spaceId: space!.id, beforeId })),
    editTab: tab => form({ title: 'Edit tab', fields: [{ key: 'title', label: 'Title', value: tab.title }, { key: 'url', label: 'URL', value: tab.url }], onSubmit: v => mutate({ type: 'tab:edit', id: tab.id, title: v.title!, url: v.url! }) }),
    removeTab: tab => run(() => mutate({ type: 'tab:delete', id: tab.id })),
    openTab,
    moveTab: tab => form({ title: 'Move tab', fields: [{ key: 'collection', label: 'Destination collection', value: library!.spaces.flatMap(s => s.collections).find(c => c.tabs.some(t => t.id === tab.id))!.id, options: library!.spaces.flatMap(s => s.collections.map(c => ({ value: c.id, label: `${s.name} / ${c.name}` }))) }], onSubmit: v => mutate({ type: 'tab:move', id: tab.id, collectionId: v.collection! }) }),
    reorderTab: (tab, collectionId, beforeId) => run(() => mutate({ type: 'tab:move', id: tab.id, collectionId, beforeId })),
    newCollectionFromTab: tab => nameForm('Move to new collection', '', name => mutate({ type: 'tab:newCollection', id: tab.id, spaceId: space!.id, name })),
    mergeCollection: collection => {
      const targets = library!.spaces.flatMap(s => s.collections.filter(c => c.id !== collection.id).map(c => ({ value: c.id, label: `${s.name} / ${c.name}` })));
      if (!targets.length) { notifications.show({ message: 'Create another collection to merge into.' }); return; }
      form({ title: 'Merge collections?', description: 'All source tabs will be appended to the destination. The source collection will be removed.', fields: [{ key: 'target', label: 'Destination collection', value: targets[0]!.value, options: targets }], confirmLabel: 'Merge', onSubmit: v => mutate({ type: 'collection:merge', id: collection.id, targetId: v.target! }) });
    },
    startDrag, dropCollection, dropGap,
    merge: targetId => { const item = takeDrag(); if (item?.kind !== 'collection') return; const target = findCollection(library!, targetId).collection; confirm('Merge collections?', `Move all tabs into ${target.name} and remove the source collection?`, () => mutate({ type: 'collection:merge', id: item.id, targetId }), 'Merge'); },
  };

  return <div className={`workspace ${!sidebar ? 'sidebar-hidden' : ''} ${!rightbar ? 'rightbar-hidden' : ''} ${drag ? 'is-dragging' : ''}`} onDragOver={autoScroll} onDrop={event => { if (!event.defaultPrevented) clearDrag(); }}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark" aria-hidden="true"><span /></span><strong>Tab Cove</strong></div>
      <button className="search-trigger" disabled={!library} onClick={() => setSearch(true)}><IconSearch size={19} /><span>Search</span><kbd>/</kbd></button>
      <div className="spaces-heading">Spaces</div>
      <nav className="spaces-list" aria-label="Spaces" data-scroll-panel>
        {library?.spaces.map((s, si) => <div key={s.id}>
          {drag?.kind === 'space' && drag.id !== s.id && <DropZone active label="Move space here" className="space-gap" onDrop={() => { const item = takeDrag(); if (item?.kind === 'space') run(() => mutate({ type: 'space:move', id: item.id, beforeId: s.id })); }} />}
          <DropZone active={drag?.kind === 'collection'} label={`Move collection to ${s.name}`} onDrop={() => { const item = takeDrag(); if (item?.kind === 'collection') run(() => mutate({ type: 'collection:move', id: item.id, spaceId: s.id })); }} className="space-drop">
            <div className={`space-item ${s.id === spaceId ? 'selected' : ''}`} draggable onDragStart={e => startDrag(e, { kind: 'space', id: s.id })}>
              <button className="space-select" aria-current={s.id === spaceId ? 'page' : undefined} onClick={() => state.selectSpace(s.id)}><span className={`space-initial color-${si % 5}`}>{s.name.slice(0, 1).toUpperCase()}</span><span>{s.name}</span></button>
              <MoreMenu label={`Options for space ${s.name}`}>
                <Menu.Item leftSection={<IconEdit size={15} />} onClick={() => nameForm('Rename space', s.name, name => mutate({ type: 'space:rename', id: s.id, name }))}>Rename</Menu.Item>
                <Menu.Item disabled={si === 0} leftSection={<IconArrowUp size={15} />} onClick={() => run(() => mutate({ type: 'space:move', id: s.id, beforeId: library.spaces[si - 1]?.id }))}>Move up</Menu.Item>
                <Menu.Item disabled={si === library.spaces.length - 1} leftSection={<IconArrowDown size={15} />} onClick={() => run(() => mutate({ type: 'space:move', id: s.id, beforeId: library.spaces[si + 2]?.id }))}>Move down</Menu.Item>
                <Menu.Divider /><Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => confirm('Delete space?', `Delete ${s.name}, ${s.collections.length} collections and ${s.collections.reduce((n, c) => n + c.tabs.length, 0)} saved tabs?`, () => mutate({ type: 'space:delete', id: s.id }))}>Delete space</Menu.Item>
              </MoreMenu>
            </div>
          </DropZone>
        </div>)}
        <button className="create-space" onClick={newSpace} disabled={!library || !!state.libraryError}><IconPlus size={20} />Create Space</button>
      </nav>
      <footer className="sidebar-footer"><button onClick={settings} disabled={!library}><IconSettings size={19} />Settings</button><div className="local-status"><span />Saved on this device</div></footer>
    </aside>
    <main className="main-panel" data-scroll-panel aria-busy={busy}>
      <div className="panel-toggles"><Tool label={sidebar ? 'Hide spaces' : 'Show spaces'} onClick={() => setSidebar(!sidebar)}><IconLayoutSidebar size={18} /></Tool><Tool label={rightbar ? 'Hide open tabs' : 'Show open tabs'} onClick={() => setRightbar(!rightbar)}><IconLayoutSidebarRight size={18} /></Tool></div>
      {state.libraryError && <Alert color="red" title="Could not load your library" m="lg"><p>{state.libraryError}</p><Button variant="outline" size="xs" onClick={() => void state.loadLibrary()}>Retry</Button></Alert>}
      {report && <Alert className="operation-report" color="orange" title={report.message} withCloseButton onClose={() => setReport(undefined)}><ul>{report.failures.map((f, i) => <li key={i}>{f}</li>)}</ul>{report.retry && <Button size="xs" variant="outline" onClick={() => run(() => perform(report.retry!))} disabled={busy}>Retry failed steps</Button>}</Alert>}
      {!library && !state.libraryError && <div className="empty-state"><div className="loader" /><p>Opening your library…</p></div>}
      {library && !space && <div className="empty-state board-empty"><IconFolder size={42} stroke={1.2} /><h2>Make room for your next idea</h2><p>Create a space to start organizing your tabs.</p><button className="primary-button" onClick={newSpace}>Create Space</button></div>}
      {space && <fieldset className="workspace-fieldset" disabled={busy || !!state.libraryError}>
        <header className="space-header"><div className="space-title"><span className="space-symbol">{space.name.slice(0, 1).toUpperCase()}</span><h1>{space.name}</h1><span className="space-stats">{space.collections.length} Collections <span>·</span> {space.collections.reduce((n, c) => n + c.tabs.length, 0)} tabs</span></div></header>
        <div className="board-toolbar"><div className="toolbar-left"><span className="order-label"><IconArrowDown size={15} />Custom order</span><span className="toolbar-divider" /><Tool label="Expand all collections" onClick={() => setCollapsed(new Set())}><IconPlus size={19} /></Tool><Tool label="Collapse all collections" onClick={() => setCollapsed(new Set(space.collections.map(c => c.id)))}><IconMinus size={19} /></Tool></div><button className="primary-button" onClick={() => boardActions.create()}><IconPlus size={18} />New Collection</button></div>
        {library?.preferences.saveDisposition !== 'ask' && <div className="preference-note">Saving tabs will {library?.preferences.saveDisposition === 'close' ? 'close them after they are saved' : 'keep them open'}. <button className="text-button" onClick={settings}>Change</button></div>}
        <Board space={space} collapsed={collapsed} toggle={id => setCollapsed(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })} drag={drag} actions={boardActions} />
      </fieldset>}
      {busy && <div className="busy-status" role="status">Saving changes…</div>}
    </main>
    <aside className="open-panel" data-scroll-panel><fieldset className="workspace-fieldset" disabled={busy}>
      <OpenTabs snapshot={snapshot} currentWindowId={currentWindowId} error={state.browserError} refresh={() => void state.loadBrowser()} drag={drag} actions={{
        startDrag, drop: dropBrowser,
        move: (tab, target) => {
          if (target) { run(() => perform({ type: 'move', tabId: tab.id, target })); return; }
          const destinations = (snapshot?.windows || []).flatMap((w, wi) => [
            { value: `window-${w.id}`, label: `${w.id === currentWindowId ? 'This window' : `Window ${wi + 1}`} / No group`, target: { windowId: w.id } as OpenTarget },
            ...w.groups.map(g => ({ value: `group-${g.id}`, label: `Window ${wi + 1} / ${g.title || 'Unnamed group'}`, target: { windowId: w.id, groupId: g.id } as OpenTarget })),
          ]);
          form({ title: 'Move browser tab', fields: [{ key: 'target', label: 'Destination', value: `window-${tab.windowId}`, options: destinations }], onSubmit: async v => {
            const destination = destinations.find(d => d.value === v.target);
            if (!destination) throw new Error('Choose a destination.');
            await perform({ type: 'move', tabId: tab.id, target: destination.target });
          } });
        },
        save: source => run(() => save(source)), focus: tab => run(() => perform({ type: 'focus', tabId: tab.id })), close: tab => run(() => perform({ type: 'close', tabId: tab.id })),
        collapse: group => run(() => perform({ type: 'editGroup', groupId: group.id, collapsed: !group.collapsed })),
        ungroup: group => run(() => perform({ type: 'ungroup', groupId: group.id })),
        editGroup: group => form({ title: 'Edit tab group', fields: [{ key: 'name', label: 'Group name', value: group.title, optional: true }, { key: 'color', label: 'Color', value: group.color, options: Object.keys(groupColors).map(color => ({ value: color, label: color.charAt(0).toUpperCase() + color.slice(1) })) }], onSubmit: v => perform({ type: 'editGroup', groupId: group.id, title: v.name, color: v.color as keyof typeof groupColors }) }),
      }} />
    </fieldset></aside>
    {editor && <EditorDialog key={editor.key} config={editor} onClose={() => setEditor(undefined)} />}
    {choice && <ChoiceDialog {...choice} onClose={() => setChoice(undefined)} />}
    {search && library && <Search library={library} snapshot={snapshot} onOpen={searchOpen} onJump={jump} onClose={() => setSearch(false)} />}
  </div>;
}

/** 提供统一主题与可访问的弹窗／通知环境，状态由后台本地资料库驱动。 */
export default function App() {
  return <MantineProvider forceColorScheme="light" theme={{ primaryColor: 'pink', primaryShade: 6, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', defaultRadius: 'md', colors: { pink: ['#fff0f5', '#ffe0eb', '#ffb9d0', '#ff91b4', '#fa709e', '#f6538c', '#ed467f', '#d23268', '#b92656', '#9f1947'] } }}><Notifications position="bottom-center" limit={3} /><Workspace /></MantineProvider>;
}
