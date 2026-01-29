import { TabInfo } from '~/entrypoints/background/modules/windowCatalog/types';

export interface Team {
  _id: string;
  name: string;
  avatar?: string;
}

export interface Space {
  _id: string;
  name: string;
}

export interface SpaceMembership {
  _id: string;
  teamId: string;
  spaceId: string;
  role: 'admin' | 'full';
}

export interface Resource {
  _id: string;
  spaceId: string;
  createdBy: string; // 记录创建者的 userId
  urls: TabInfo[];
}