
import TeamsMenu from './components/TeamsMenu';
import AddTeamModal from './components/AddTeamModal';
import AddSpaceModal from './components/AddSpaceModal';
import AddCabinetModal from './components/AddCabinetModal';
import Workbench from './components/Workbench';
import WindowCatalog from './components/WindowCatalog';

import styles from './index.module.less';

export default () => {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.page__left}>
          <TeamsMenu />
        </div>

        <div className={styles.page__center}>
          <Workbench />
        </div>

        <div className={styles.page__right}>
          <WindowCatalog />
        </div>
      </div>

      <AddTeamModal />
      <AddSpaceModal />
      <AddCabinetModal />
    </>
  );
}
