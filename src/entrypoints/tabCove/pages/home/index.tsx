import * as styles from './index.module.less';

export default function home() {
  return (
    <div className={styles.page}>
      <div className={styles.page__left}></div>
      <div className={styles.page__center}></div>
      <div className={styles.page__right}></div>
    </div>
  );
}