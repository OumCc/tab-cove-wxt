/*
 * @Description: 简单封装 antd 的 Empty
 */

import emptyImg from '~/assets/empty.png'

import styles from './index.module.less';

const Empty = (props: any) => {
  const {
    mode = 'block',// block：宽高自适应父组件，内容居中; normal：原版 AntdEmpty
    image = 'https://res.miaocode.com/h5-activity-3/no-data.png',
  } = props;

  return (
    <div className={styles.box}>
      
    </div>
  );
};

export default Empty;