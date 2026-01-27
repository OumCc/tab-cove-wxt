/**
 * 判断是否需要包含该标签页
 *    FIXME: 采用白名单逻辑，后续可以增加动态配置白名单
 * @param url 标签页的 URL
 * @returns 是否需要包含该标签页
 */
export default (url: string) => {
  const whiteList = [
    'http://',
    'https://',
  ];

  return whiteList.some(prefix => url.startsWith(prefix));
}