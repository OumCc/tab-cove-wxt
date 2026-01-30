/*
 * @Description: 定义 @wxt-dev/storage 相关的存储项
 */
import type { User, Team, TeamMembership, Space, SpacePermission, Resource, } from '~/types/core';

export const userStorage = storage.defineItem<User | null>('local:user', {
  fallback: null, // 当存储项不存在时返回空
  version: 1, // 版本号，便于后续数据迁移
});

export const teamsStorage = storage.defineItem<Team[]>('local:teams', {
  fallback: [],
  version: 1,
});

export const teamMembershipsStorage = storage.defineItem<TeamMembership[]>('local:teamMemberships', {
  fallback: [],
  version: 1,
});

export const spacesStorage = storage.defineItem<Space[]>('local:spaces', {
  fallback: [],
  version: 1,
});

export const spaceMembershipsStorage = storage.defineItem<SpacePermission[]>('local:spaceMemberships', {
  fallback: [],
  version: 1,
});

export const resourcesStorage = storage.defineItem<Resource[]>('local:resources', {
  fallback: [],
  version: 1,
});