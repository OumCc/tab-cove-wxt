/** 页面国际化入口；订阅界面偏好，异步回调可读取最新语言。 */
import { useUiPreferences } from '../store/uiPreferences.ts';
import { countLabel, resolveLocale, translate, translateError, type MessageParams } from './core.ts';
import type { MessageKey } from './messages.ts';

/** 返回当前解析后的语言；仅在页面环境调用。 */
export function getLocale() {
  const state = useUiPreferences.getState();
  return resolveLocale(state.language, state.browserLanguages);
}
/** 读取最新语言翻译文案，适合事件与异步回调。 */
export function t(key: MessageKey, params?: MessageParams) { return translate(getLocale(), key, params); }
/** 将来自后台或页面的系统错误转换为当前语言。 */
export function errorMessage(error: unknown) { return translateError(getLocale(), error); }
/** 格式化数量；不用于业务判断。 */
export function count(kind: Parameters<typeof countLabel>[1], value: number) { return countLabel(getLocale(), kind, value); }
/** 订阅语言变化，让调用者重新渲染文案。 */
export function useI18n() {
  const language = useUiPreferences(s => s.language);
  const browserLanguages = useUiPreferences(s => s.browserLanguages);
  return { locale: resolveLocale(language, browserLanguages), t, count };
}
/** 首次渲染前同步文档语言，后续偏好变化保持屏幕阅读器语言正确。 */
export function startLanguageSync() {
  const sync = () => { document.documentElement.lang = getLocale(); };
  sync();
  return useUiPreferences.subscribe(sync);
}
