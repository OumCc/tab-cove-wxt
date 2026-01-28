import { TabInfo } from '~/entrypoints/background/modules/windowCatalog/types';

export interface Resource {
  id: string;
  spaceId: string;
  name: string;
  urls: TabInfo[];
}

/** Space 成员：沿用 User 的 id、name、avatar，并增加 role */
export interface SpaceMember extends Pick<User, 'id' | 'name' | 'avatar'> {
  role: 'admin' | 'full';
}

export interface Space {
  id: string;
  ownerUserId: string;
  name: string;
  access: 'public' | 'private';
  resources: Resource[];
  members: SpaceMember[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  spaces: Space[];
}

