export interface TabInfo {
  id: number;
  url: string;
  title: string;
  windowId: number; // 所属窗口的 ID。对应 WindowInfo.id
  index: number;
  favIconUrl?: string;
}

export interface WindowInfo {
  id: number;
  tabs: TabInfo[];
}