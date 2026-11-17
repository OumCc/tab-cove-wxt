/** 无浏览器依赖的语言解析和格式化；未知语言回退英文，不翻译用户输入。 */
import { messages, type MessageKey } from './messages.ts';
export type Locale = 'en' | 'zh-CN' | 'zh-TW';
export type LanguagePreference = Locale | 'system';
export type MessageParams = Record<string, string | number>;

/** 校验持久化语言选项；旧版本或无效值跟随浏览器。 */
export function languagePreference(value: unknown): LanguagePreference {
  return value === 'en' || value === 'zh-CN' || value === 'zh-TW' ? value : 'system';
}
/** 按浏览器首选语言顺序匹配；中文脚本优先于地区，港澳台使用繁体。 */
export function resolveLocale(preference: LanguagePreference, languages: readonly string[]): Locale {
  if (preference !== 'system') return preference;
  for (const language of languages) {
    const parts = language.toLowerCase().replaceAll('_', '-').split('-');
    if (parts[0] === 'en') return 'en';
    if (parts[0] === 'zh') {
      if (parts.includes('hant')) return 'zh-TW';
      if (parts.includes('hans')) return 'zh-CN';
      return parts.some(part => ['tw', 'hk', 'mo'].includes(part)) ? 'zh-TW' : 'zh-CN';
    }
  }
  return 'en';
}
/** 替换命名占位符；参数按文本使用，不进行 HTML 解析或二次插值。 */
export function translate(locale: Locale, key: MessageKey, params: MessageParams = {}): string {
  const template = locale === 'en' ? key : (messages[key]?.[locale === 'zh-CN' ? 0 : 1] || key);
  return template.replace(/\{(\w+)\}/g, (token, name: string) => {
    const value = params[name];
    return value === undefined ? token : typeof value === 'number' ? new Intl.NumberFormat(locale).format(value) : value;
  });
}
/** 已知系统消息按词典翻译，未知错误使用可操作的通用提示。 */
export function translateError(locale: Locale, error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return translate(locale, Object.hasOwn(messages, message) ? message as MessageKey : 'Something went wrong. Please retry.');
}
/** 标签页、集合和搜索结果共用数量格式，英文区分单复数。 */
export function countLabel(locale: Locale, kind: 'tabs' | 'collections' | 'matches' | 'saved' | 'opened', count: number): string {
  const keys: Record<typeof kind, readonly [MessageKey, MessageKey]> = {
    tabs: ['{count} tab', '{count} tabs'], collections: ['{count} collection', '{count} collections'], matches: ['{count} match', '{count} matches'],
    saved: ['{count} tab saved', '{count} tabs saved'], opened: ['{count} tab opened', '{count} tabs opened'],
  };
  return translate(locale, keys[kind][count === 1 ? 0 : 1], { count });
}
/** 仅用于新建会话的默认名称，已保存名称不会随语言切换改写。 */
export function sessionName(locale: Locale, date: Date): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
