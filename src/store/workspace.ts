/** 扩展页面使用真实消息端口；状态工厂允许独立验证请求竞态。 */
import { getLibrary, getSnapshot, importBackup, mutateLibrary } from '../services/core.ts';
import { createWorkspace } from './createWorkspace.ts';
/** 缓存后台已确认的资料库与浏览器目录，不直接写 storage.local。 */
export const useWorkspace = createWorkspace({ getLibrary, getSnapshot, importBackup, mutateLibrary });
