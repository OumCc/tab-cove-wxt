/** 收藏区域：显示持久化卡片及明确的排序／合并落点，不直接调用浏览器 API。 */
import type { DragEvent } from 'react';
import { useI18n, t, count } from '../../../i18n/index.ts';
import { Menu } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsMove, IconChevronDown, IconChevronRight, IconDownload, IconEdit, IconExternalLink, IconGripVertical, IconPlus, IconStack2, IconTrash, IconX } from '@tabler/icons-react';
import type { Collection, SavedTab, Space } from '../../../types/core.ts';
import { DropZone, Favicon, MoreMenu, Tool, type DragItem } from './ui';
export interface BoardActions {
  create(beforeId?: string): void; rename(collection: Collection): void; remove(collection: Collection): void;
  open(collection: Collection): void; save(collection: Collection): void; move(collection: Collection): void;
  mergeCollection(collection: Collection): void;
  newCollectionFromTab(tab: SavedTab): void;
  reorder(collection: Collection, beforeId?: string): void;
  editTab(tab: SavedTab): void; removeTab(tab: SavedTab): void; openTab(tab: SavedTab): void; moveTab(tab: SavedTab): void;
  reorderTab(tab: SavedTab, collectionId: string, beforeId?: string): void;
  startDrag(event: DragEvent, item: DragItem): void;
  dropCollection(targetId: string, beforeId?: string): void;
  dropGap(beforeId?: string): void; merge(targetId: string): void;
}
/** 展示集合卡片并提供同一套命令的鼠标和键盘入口。 */
export function Board({ space, collapsed, toggle, drag, actions }: { space: Space; collapsed: Set<string>; toggle(id: string): void; drag?: DragItem; actions: BoardActions }) {
  useI18n();
  function gap(beforeId?: string) { return <DropZone active={!!drag && ['tab', 'live', 'collection'].includes(drag.kind)} label={drag?.kind === 'collection' ? t('Move collection here') : t('Create a collection here')} onDrop={() => actions.dropGap(beforeId)} className="collection-gap" />; }
  return <div className="collections">
    {!space.collections.length && <div className="empty-state board-empty"><div className="empty-glyph"><IconStack2 size={36} stroke={1.3} /></div><h2>{t('A little space for your tabs')}</h2><p>{t('Create a collection, then drag in tabs from the right.')}<br />{t('Your work will be here when you come back.')}</p><button className="primary-button" onClick={() => actions.create()}><IconPlus size={17} />{t('New Collection')}</button></div>}
    {space.collections.map((c, ci) => <div key={c.id}>{gap(c.id)}
      <section className="collection" id={`collection-${c.id}`} aria-labelledby={`heading-${c.id}`}>
        <header className="collection-header">
          <Tool label={t('Reorder {name}', { name: c.name })} draggable onDragStart={e => actions.startDrag(e, { kind: 'collection', id: c.id })}><IconGripVertical size={18} /></Tool>
          <div className="collection-heading"><h2 id={`heading-${c.id}`}><button className="collection-name" onClick={() => actions.rename(c)} title={t('Rename collection')}>{c.name}</button><Tool label={t(collapsed.has(c.id) ? 'Expand {name}' : 'Collapse {name}', { name: c.name })} aria-expanded={!collapsed.has(c.id)} onClick={() => toggle(c.id)}>{collapsed.has(c.id) ? <IconChevronRight size={18} /> : <IconChevronDown size={18} />}</Tool></h2><span className="muted">{count('tabs', c.tabs.length)}</span></div>
          <div className="collection-tools">
            <Tool label={t('Open all tabs in {name}', { name: c.name })} disabled={!c.tabs.length} onClick={() => actions.open(c)}><IconExternalLink size={18} /></Tool>
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
        {drag?.kind === 'collection' && drag.id !== c.id && <DropZone active label={t('Merge into {name}', { name: c.name })} className="merge-zone" onDrop={() => actions.merge(c.id)} />}
        {!collapsed.has(c.id) && <div className="card-grid">
          {c.tabs.map((tab, ti) => <DropZone key={tab.id} active={!!drag && ['tab', 'live'].includes(drag.kind) && drag.id !== tab.id} label={t('Insert before {name}', { name: tab.title })} className="card-drop" onDrop={() => actions.dropCollection(c.id, tab.id)}>
            <article className="tab-card" draggable onDragStart={e => actions.startDrag(e, { kind: 'tab', id: tab.id })}>
              <button className="card-open" title={tab.url} onClick={() => actions.openTab(tab)}><Favicon url={tab.url} title={tab.title} /><span className="card-title">{tab.title}</span><small>{new URL(tab.url).hostname.replace(/^www\./, '')}</small></button>
              <div className="card-tools"><Tool label={t('Remove {name}', { name: tab.title })} onClick={() => actions.removeTab(tab)}><IconX size={15} /></Tool><MoreMenu label={t('Options for {name}', { name: tab.title })}>
                <Menu.Item leftSection={<IconEdit size={15} />} onClick={() => actions.editTab(tab)}>{t('Edit title & URL')}</Menu.Item>
                <Menu.Item leftSection={<IconArrowsMove size={15} />} onClick={() => actions.moveTab(tab)}>{t('Move to collection')}</Menu.Item>
                <Menu.Item onClick={() => actions.newCollectionFromTab(tab)}>{t('Move to new collection')}</Menu.Item>
                <Menu.Item disabled={ti === 0} onClick={() => actions.reorderTab(tab, c.id, c.tabs[ti - 1]?.id)}>{t('Move earlier')}</Menu.Item>
                <Menu.Item disabled={ti === c.tabs.length - 1} onClick={() => actions.reorderTab(tab, c.id, c.tabs[ti + 2]?.id)}>{t('Move later')}</Menu.Item>
              </MoreMenu></div>
            </article>
          </DropZone>)}
          <DropZone active={!!drag && ['tab', 'live'].includes(drag.kind)} label={c.tabs.length ? t('Add tabs here') : t('Drag tabs here')} className={c.tabs.length ? 'append-card' : 'empty-collection'} onDrop={() => actions.dropCollection(c.id)} />
        </div>}
        {collapsed.has(c.id) && drag && ['tab', 'live'].includes(drag.kind) && <DropZone active label={t('Save to {name}', { name: c.name })} onDrop={() => actions.dropCollection(c.id)} />}
      </section>
    </div>)}
    {gap()}
  </div>;
}
