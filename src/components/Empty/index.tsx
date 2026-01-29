/*
 * @Description: 简单封装 antd 的 Empty
 */
import classnames from 'classnames';

import emptyImg from '~/assets/empty.png'

import styles from './index.module.less';

interface EmptyProps {
  mode?: 'block' | 'normal'; // block：宽高自适应父组件，内容居中; normal：只有内容大小
  classNames?: string;
  image?: string;
  imageStyle?: React.CSSProperties;
  description?: string;
  descriptionStyle?: React.CSSProperties;
  children?: React.ReactNode;
};

const Empty = (props: EmptyProps) => {
  const {
    mode = 'block',
    classNames,
    image = emptyImg,
    imageStyle = {},
    description,
    descriptionStyle = {},
    children,
  } = props;

  return (
    <div
      className={classnames(styles.box, {
        [styles.block]: mode === 'block',
      }, classNames)}
    >
      <img
        className={styles.image}
        src={image}
        alt="empty"
        style={imageStyle}
      />
      
      {
        description ? (
          <div className={styles.description} style={descriptionStyle}>
            {description}
          </div>
        ) : null
      }

      {
        children ? (
          <div className={styles.children}>
            {children}
          </div>
        ) : null
      }
    </div>
  );
};

export default Empty;