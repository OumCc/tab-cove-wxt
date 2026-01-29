/*
 * @Description: 定义 @wxt-dev/storage 相关的存储项
 */
import type { Team, Space, SpaceMembership, Resource, } from '~/types/core';

export const teamsStorage = storage.defineItem<Team[]>('local:teams', {
  fallback: [], // 当存储项不存在时返回空数组
  version: 1, // 版本号，便于后续数据迁移
});

export const spacesStorage = storage.defineItem<Space[]>('local:spaces', {
  fallback: [],
  version: 1,
});

export const spaceMembershipsStorage = storage.defineItem<SpaceMembership[]>('local:spaceMemberships', {
  fallback: [],
  version: 1,
});

export const resourcesStorage = storage.defineItem<Resource[]>('local:resources', {
  fallback: [],
  version: 1,
});