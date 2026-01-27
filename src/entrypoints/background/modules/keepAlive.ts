/**
 * background 保活
 */

export default () => {
  browser.alarms.create('KEEP_ALIVE', {
    periodInMinutes: 4.5, // 4.5分钟发送一次保活心跳
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'KEEP_ALIVE') {
      console.log('[Background] KEEP_ALIVE heartbeat');
    }
  });
};