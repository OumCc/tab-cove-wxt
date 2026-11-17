/** 收藏区域：管理行内勾选及排序落点，通过工作台提交浏览器操作。 */
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useI18n, t, count, errorMessage } from '../../../i18n/index.ts';
import { Button, Menu } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsMove, IconArrowsShuffle, IconCheck, IconChevronDown, IconChevronRight, IconDownload, IconEdit, IconExternalLink, IconGripVertical, IconListCheck, IconPlus, IconStack2, IconTrash } from '@tabler/icons-react';
import { GROUP_COLORS } from '../../../services/libraryModel.ts';
import type { Collection, GroupColor, Preferences, SavedTab, Space } from '../../../types/core.ts';
import { DropZone, Favicon, MoreMenu, Tool, groupColorLabel, groupColors, type DragItem } from './ui';
export interface BoardActions {
  create(beforeId?: string): void; rename(collection: Collection): void; remove(collection: Collection): void;
  /** 保存固定组色，传入 null 时恢复为随机颜色。 */
  setGroupColor(collection: Collection, color: GroupColor | null): void;
  open(collection: Collection): void; save(collection: Collection): void; move(collection: Collection): void;
  /** 按给定顺序打开勾选项，命令失败时拒绝以保留本次勾选。 */
  openSelected(collection: Collection, items: SavedTab[], group: boolean, remember: boolean): Promise<void>;
  mergeCollection(collection: Collection): void;
  newCollectionFromTab(tab: SavedTab): void;
  reorder(collection: Collection, beforeId?: string): void;
  editTab(tab: SavedTab): void; removeTab(tab: SavedTab): void; openTab(tab: SavedTab): void; moveTab(tab: SavedTab): void;
  reorderTab(tab: SavedTab, collectionId: string, beforeId?: string): void;
  startDrag(event: DragEvent, item: DragItem): void;
  dropCollection(targetId: string, beforeId?: string): void;
  dropGap(beforeId?: string): void; merge(targetId: string): void;
}

function colorSwatch(color?: GroupColor) {
  return color
    ? <span className="collection-color-swatch" style={{ backgroundColor: groupColors[color] }} aria-hidden="true" />
    : <IconArrowsShuffle size={13} aria-hidden="true" />;
}

function CollectionColorMenu({ collection, onChange }: { collection: Collection; onChange: (color: GroupColor | null) => void }) {
  const { name, groupColor } = collection;
  const randomLabel = t('Random color');
  const colorLabel = groupColor ? groupColorLabel(groupColor) : randomLabel;
  return <Menu position="bottom-start" withinPortal checkIcon={<IconCheck size={13} aria-hidden="true" />}>
    <Menu.Target>
      <button type="button" className="collection-color" title={t('Tab group color')} aria-label={t('Tab group color for {name}, {color}', { name, color: colorLabel })}>
        {colorSwatch(groupColor)}
        {colorLabel}
        <IconChevronDown size={12} aria-hidden="true" />
      </button>
    </Menu.Target>
    <Menu.Dropdown>
      <Menu.Label>{t('Tab group color')}</Menu.Label>
      <Menu.RadioGroup value={groupColor ?? 'random'}>
        <Menu.RadioItem value="random" onChange={() => onChange(null)} closeMenuOnClick>
          <span className="collection-color-option">{colorSwatch()}{randomLabel}</span>
        </Menu.RadioItem>
        <Menu.Divider />
        {GROUP_COLORS.map(color => <Menu.RadioItem key={color} value={color} onChange={() => onChange(color)} closeMenuOnClick>
          <span className="collection-color-option">{colorSwatch(color)}{groupColorLabel(color)}</span>
        </Menu.RadioItem>)}
      </Menu.RadioGroup>
    </Menu.Dropdown>
  </Menu>;
}

interface TabSelection {
  collectionId: string;
  tabIds: Set<string>;
  trigger: HTMLButtonElement;
  remember: boolean;
  opening: boolean;
  error?: string;
}

/** 在当前空间展示集合，任一时刻仅允许一个集合处于勾选状态。 */
export function Board({ space, collapsed, toggle, restoreMode, groupsAvailable, drag, actions }: {
  space: Space; collapsed: Set<string>; toggle(id: string): void;
  restoreMode: Preferences['restoreMode']; groupsAvailable: boolean; drag?: DragItem; actions: BoardActions;
}) {
  useI18n();
  const [selection, setSelection] = useState<TabSelection>();
  const firstChoice = useRef<HTMLInputElement>(null);
  const activeCollection = selection && space.collections.find(c => c.id === selection.collectionId && c.tabs.length > 0 && !collapsed.has(c.id));
  const items = activeCollection?.tabs.filter(tab => selection?.tabIds.has(tab.id)) ?? [];
  const canOpen = items.length > 0 && !selection?.opening;
  const ask = restoreMode === 'ask';
  const draggingTab = drag?.kind === 'tab' || drag?.kind === 'live';

  useEffect(() => {
    if (selection && !activeCollection) setSelection(undefined);
  }, [selection, activeCollection]);

  function startSelection(collection: Collection, trigger: HTMLButtonElement) {
    if (collapsed.has(collection.id)) toggle(collection.id);
    setSelection({ collectionId: collection.id, tabIds: new Set(), trigger, remember: false, opening: false });
    requestAnimationFrame(() => firstChoice.current?.focus({ preventScroll: true }));
  }

  function cancelSelection() {
    if (!selection || selection.opening) return;
    setSelection(undefined);
    selection.trigger.focus({ preventScroll: true });
  }

  function toggleTab(id: string, checked: boolean) {
    setSelection(current => {
      if (!current || current.opening) return current;
      const tabIds = new Set(current.tabIds);
      if (checked) tabIds.add(id);
      else tabIds.delete(id);
      return { ...current, tabIds };
    });
  }

  async function openSelected(group: boolean) {
    if (!selection || !activeCollection || !canOpen) return;
    const opening = { ...selection, opening: true, error: undefined };
    setSelection(opening);
    try {
      await actions.openSelected(activeCollection, items, group, ask && selection.remember);
      setSelection(current => current === opening ? undefined : current);
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) opening.trigger.focus({ preventScroll: true });
      });
    } catch (error) {
      setSelection(current => current === opening ? { ...current, opening: false, error: errorMessage(error) } : current);
    }
  }

  function gap(beforeId?: string) { return <DropZone active={!!drag && ['tab', 'live', 'collection'].includes(drag.kind)} label={drag?.kind === 'collection' ? t('Move collection here') : t('Create a collection here')} onDrop={() => actions.dropGap(beforeId)} className="collection-gap" />; }
  return <div className="collections" onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !event.nativeEvent.isComposing) cancelSelection();
  }}>
    {!space.collections.length && <div className="empty-state board-empty"><div className="empty-glyph"><IconStack2 size={36} stroke={1.3} /></div><h2>{t('A little space for your tabs')}</h2><p>{t('Create a collection, then drag in tabs from the right.')}<br />{t('Your work will be here when you come back.')}</p><button className="primary-button" onClick={() => actions.create()}><IconPlus size={17} />{t('New Collection')}</button></div>}
    {space.collections.map((c, ci) => {
      const picking = activeCollection?.id === c.id ? selection : undefined;
      return <div key={c.id}>{gap(c.id)}
        <section className="collection" id={`collection-${c.id}`} aria-labelledby={`heading-${c.id}`}>
          <header className="collection-header">
            <Tool label={t('Reorder {name}', { name: c.name })} draggable onDragStart={e => actions.startDrag(e, { kind: 'collection', id: c.id })}><IconGripVertical size={18} /></Tool>
            <div className="collection-heading">
              <h2 id={`heading-${c.id}`}><button className="collection-name" onClick={() => actions.rename(c)} title={t('Rename collection')}>{c.name}</button><Tool label={t(collapsed.has(c.id) ? 'Expand {name}' : 'Collapse {name}', { name: c.name })} aria-expanded={!collapsed.has(c.id)} onClick={() => toggle(c.id)}>{collapsed.has(c.id) ? <IconChevronRight size={18} /> : <IconChevronDown size={18} />}</Tool></h2>
              <div className="collection-meta">
                <span className="muted">{count('tabs', c.tabs.length)}</span>
                <CollectionColorMenu collection={c} onChange={color => actions.setGroupColor(c, color)} />
              </div>
            </div>
            <div className="collection-tools">
              <Tool label={t('Open all tabs in {name}', { name: c.name })} disabled={!c.tabs.length || !!picking} onClick={() => actions.open(c)}><IconExternalLink size={18} /></Tool>
              <Tool
                className={picking ? 'primary-button collection-selection-open' : 'tool'}
                label={t('Open selected tabs in {name}', { name: c.name })}
                title={t('Open selected tabs')}
                disabled={!c.tabs.length}
                aria-disabled={picking ? !canOpen : undefined}
                onClick={event => {
                  if (picking) void openSelected(restoreMode === 'group');
                  else startSelection(c, event.currentTarget);
                }}
              >
                {picking ? t('Open selected tabs') : <IconListCheck size={18} aria-hidden="true" />}
              </Tool>
              <Tool label={t('Save session into {name}', { name: c.name })} onClick={() => actions.save(c)}><IconDownload size={18} /></Tool>
              <MoreMenu label={t('Options for {name}', { name: c.name })}>
                <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => actions.rename(c)}>{t('Rename')}</Menu.Item>
                <Menu.Item leftSection={<IconArrowsMove size={16} />} onClick={() => actions.move(c)}>{t('Move to space')}</Menu.Item>
                <Menu.Item onClick={() => actions.mergeCollection(c)}>{t('Merge into collection')}</Menu.Item>
                <Menu.Item disabled={ci === 0} leftSection={<IconArrowUp size={16} />} onClick={() => actions.reorder(c, space.collections[ci - 1]?.id)}>{t('Move up')}</Menu.Item>
                <Menu.Item disabled={ci === space.collections.length - 1} leftSection={<IconArrowDown size={16} />} onClick={() => actions.reorder(c, space.collections[ci + 2]?.id)}>{t('Move down')}</Menu.Item>
                <Menu.Divider /><Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => actions.remove(c)}>{t('Delete collection')}</Menu.Item>
              </MoreMenu>
            </div>
          </header>
          {picking && <>
            <div className="collection-selection-bar">
              <span role="status">{t('{tabs} selected', { tabs: count('tabs', items.length) })}</span>
              <div className="collection-selection-actions">
                {ask && <>
                  <label className="collection-selection-remember">
                    <input type="checkbox" checked={picking.remember} disabled={picking.opening}
                      onChange={event => setSelection({ ...picking, remember: event.currentTarget.checked })}
                    />
                    {t('Remember how to open tabs')}
                  </label>
                  <Button variant="default" size="compact-xs" disabled={!canOpen || !groupsAvailable} onClick={() => void openSelected(true)}>
                    {t('Open as Group')}
                  </Button>
                </>}
                <button type="button" className="text-button" disabled={picking.opening} onClick={cancelSelection}>{t('Cancel')}</button>
              </div>
            </div>
            {picking.error && <p className="inline-error" role="alert">{picking.error}</p>}
          </>}
          {!picking && drag?.kind === 'collection' && drag.id !== c.id && <DropZone active label={t('Merge into {name}', { name: c.name })} className="merge-zone" onDrop={() => actions.merge(c.id)} />}
          {!collapsed.has(c.id) && <div className="card-grid">
            {c.tabs.map((tab, ti) => {
              const content = <>
                <Favicon url={tab.url} title={tab.title} />
                <span className="card-title">{tab.title}</span>
                <small>{new URL(tab.url).hostname.replace(/^www\./, '')}</small>
              </>;
              return <DropZone key={tab.id} active={!picking && draggingTab && drag?.id !== tab.id} label={t('Insert before {name}', { name: tab.title })} className="card-drop" onDrop={() => actions.dropCollection(c.id, tab.id)}>
                <article className="tab-card" draggable={!picking} onDragStart={event => {
                  if (picking) event.preventDefault();
                  else actions.startDrag(event, { kind: 'tab', id: tab.id });
                }}>
                  {picking ? <label className="card-open card-select" title={tab.url}>
                    {content}
                    <input type="checkbox" ref={ti === 0 ? firstChoice : undefined} checked={picking.tabIds.has(tab.id)} disabled={picking.opening}
                      onChange={event => toggleTab(tab.id, event.currentTarget.checked)}
                    />
                  </label> : <>
                    <button className="card-open" title={tab.url} onClick={() => actions.openTab(tab)}>{content}</button>
                    <Tool className="tool card-delete" label={t('Remove {name}', { name: tab.title })} onClick={() => actions.removeTab(tab)}><IconTrash size={16} /></Tool>
                    <div className="card-tools">
                      <Tool label={t('Edit title & URL')} onClick={() => actions.editTab(tab)}><IconEdit size={16} /></Tool>
                      <MoreMenu label={t('Options for {name}', { name: tab.title })}>
                        <Menu.Item leftSection={<IconArrowsMove size={15} />} onClick={() => actions.moveTab(tab)}>{t('Move to collection')}</Menu.Item>
                        <Menu.Item onClick={() => actions.newCollectionFromTab(tab)}>{t('Move to new collection')}</Menu.Item>
                        <Menu.Item disabled={ti === 0} onClick={() => actions.reorderTab(tab, c.id, c.tabs[ti - 1]?.id)}>{t('Move earlier')}</Menu.Item>
                        <Menu.Item disabled={ti === c.tabs.length - 1} onClick={() => actions.reorderTab(tab, c.id, c.tabs[ti + 2]?.id)}>{t('Move later')}</Menu.Item>
                      </MoreMenu>
                    </div>
                  </>}
                </article>
              </DropZone>;
            })}
            <DropZone active={!picking && draggingTab} label={c.tabs.length ? t('Add tabs here') : t('Drag tabs here')} className={c.tabs.length ? 'append-card' : 'empty-collection'} onDrop={() => actions.dropCollection(c.id)} />
          </div>}
          {collapsed.has(c.id) && draggingTab && <DropZone active label={t('Save to {name}', { name: c.name })} onDrop={() => actions.dropCollection(c.id)} />}
        </section>
      </div>;
    })}
    {gap()}
  </div>;
}
