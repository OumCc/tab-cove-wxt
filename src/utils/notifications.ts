/*
 * @Description: 简易封装 @mantine/notifications
 *    固定 success、error、info、warning 四种表现类型，避免到处重复写
 */
import { notifications as mantineNotifications } from '@mantine/notifications';
import type { NotificationData } from '@mantine/notifications';
import React from 'react';
import {
  IconCheck,
  IconExclamationMark,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';

const DEFAULT_POSITION: NotificationData['position'] = 'top-right';

function showWithDefaults(
  defaults: Partial<Pick<NotificationData, 'position' | 'icon' | 'color'>>,
  options: Partial<NotificationData>
): string {
  return mantineNotifications.show({ ...defaults, ...options } as NotificationData);
}

/**
 * 与 @mantine/notifications 的 notifications 完全一致，并额外提供 success / error / info / warning 四个快捷方法。
 * 四个方法默认固定 position='top-right' 及对应 icon、color，传入参数会合并并可覆盖这些默认值。
 */
export const notifications = {
  ...mantineNotifications,
  success(options: Partial<NotificationData>) {
    return showWithDefaults(
      {
        position: DEFAULT_POSITION,
        icon: React.createElement(IconCheck),
        color: 'teal',
      },
      options
    );
  },
  error(options: Partial<NotificationData>) {
    return showWithDefaults(
      {
        position: DEFAULT_POSITION,
        icon: React.createElement(IconX),
        color: 'red',
      },
      options
    );
  },
  info(options: Partial<NotificationData>) {
    return showWithDefaults(
      {
        position: DEFAULT_POSITION,
        icon: React.createElement(IconInfoCircle),
        color: 'blue',
      },
      options
    );
  },
  warning(options: Partial<NotificationData>) {
    return showWithDefaults(
      {
        position: DEFAULT_POSITION,
        icon: React.createElement(IconExclamationMark),
        color: '#faad14',
      },
      options
    );
  },
};
