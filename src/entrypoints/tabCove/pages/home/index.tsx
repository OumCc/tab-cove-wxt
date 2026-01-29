import UserMenu from './components/UserMenu';
import AddUsersModal from './components/AddUsersModal';
import WindowCatalog from './components/WindowCatalog';

import styles from './index.module.less';

export default () => {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.page__left}>
          <UserMenu />
        </div>

        <div className={styles.page__center}>
          
        </div>

        <div className={styles.page__right}>
          <WindowCatalog />
        </div>
      </div>

      <AddUsersModal />
    </>
  );
}
