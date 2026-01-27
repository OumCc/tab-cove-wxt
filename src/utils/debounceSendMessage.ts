import { debounce, type DebounceSettings } from 'lodash-es';

import { sendMessage } from '~/types/messaging';

/**
 * 创建一个带防抖功能的消息发送函数
 * @param wait 防抖延迟时间（毫秒）
 * @param options lodash debounce 的选项（可选）
 * @returns 防抖后的消息发送函数
 */
export function createDebouncedSender<T extends (...args: any[]) => any>(
  wait: number,
  options?: DebounceSettings
) {
  // 直接返回防抖处理后的函数
  return debounce<T>(async (...args: Parameters<T>) => {
    try {
      // 这里直接调用原始的 sendMessage
      // 您可以根据实际调用方式调整参数
      return await sendMessage(...args);
    } catch (error) {
      console.error('防抖消息发送失败:', error);
      throw error;
    }
  }, wait, options);
}

// 使用示例：为特定场景创建一个防抖发送器
export const debounceSendMessage = createDebouncedSender(300); // 500ms 延迟