import { TabInfo } from '~/entrypoints/background/modules/windowCatalog/types';

export interface Resource {
  id: string;
  spaceId: string;
  name: string;
  urls: TabInfo[];
}

export interface Space {
  id: string;
  ownerUserId: string;
  name: string;
  access: 'public' | 'private';
  resources: Resource[];
  members: User[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  spaces: Space[];
}