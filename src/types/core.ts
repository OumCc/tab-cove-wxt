import { TabInfo } from '~/entrypoints/background/modules/windowCatalog/types';

export interface User {
  _id: string;
  name: string;
  avatar?: string;
}

export interface Team {
  _id: string;
  name: string;
  avatar?: string;
}

export interface TeamMembership {
  _id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
}

export interface Space {
  _id: string;
  name: string;
  teamId: string; // space 所属的 team
  createdBy: string; // space 的创建者的 userId
  visibility: 'public' | 'protected' | 'private';
}

export interface SpacePermission {
  _id: string;
  spaceId: string;
  userId: string; // 被授权的用户
}

export interface Cabinet {
  _id: string;
  name: string;
  spaceId: string;
  urls: TabInfo[];
}