import TeamMenu from './components/TeamMenu';
import AddUsersModal from './components/AddUsersModal';
import Workbench from './components/Workbench';
import WindowCatalog from './components/WindowCatalog';

import styles from './index.module.less';

export default () => {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.page__left}>
          <TeamMenu />
        </div>

        <div className={styles.page__center}>
          <Workbench />
        </div>

        <div className={styles.page__right}>
          <WindowCatalog />
        </div>
      </div>

      <AddUsersModal />
    </>
  );
}
