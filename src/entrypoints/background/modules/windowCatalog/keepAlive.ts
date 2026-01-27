/**
 * background 保活
 */

export default () => {
  browser.alarms.create('keepAlive', {
    periodInMinutes: 4.5, // 4.5分钟发送一次保活心跳
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keep-alive') {
      console.log('[Background] Keep-alive heartbeat');
    }
  });
}