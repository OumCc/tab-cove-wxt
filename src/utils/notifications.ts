/*
 * @Description: 简易封装 @mantine/notifications
 *    固定 success、error、info、warning 四种表现类型，避免到处重复写
 */
import { notifications } from '@mantine/notifications';
import { IconExclamationMark } from '@tabler/icons-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

