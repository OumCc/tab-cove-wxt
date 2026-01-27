import { debounce, type DebounceSettings } from 'lodash-es';

import { sendMessage } from '~/types/messaging';

/**
 * 创建一个带防抖功能的消息发送函数
 * @param wait 防抖延迟时间（毫秒）
 * @param options lodash debounce 的选项（可选）
 * @returns 防抖后的消息发送函数
 */
export function createDebouncedSender(
  wait: number,
  options?: DebounceSettings
) {
  return debounce(async (...args: Parameters<typeof sendMessage>) => {
    try {
      return await sendMessage(...args);
    } catch (error) {
      // FIXME:  如果没有接收端时调用 sendMessage 接口，这里会报错：Error: Could not establish connection. Receiving end does not exist.
      console.error('防抖消息发送失败:', error);
      throw error;
    }
  }, wait, options);
}

// 使用示例：为特定场景创建一个防抖发送器
export const debounceSendMessage = createDebouncedSender(300); // 500ms 延迟