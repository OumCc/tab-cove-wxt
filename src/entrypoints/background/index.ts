import keepAlive from './modules/keepAlive';
import iconClickOpenTabCove from './modules/iconClickOpenTabCove';
import windowCatalog from './modules/windowCatalog';

export default defineBackground(() => {
  keepAlive();
  iconClickOpenTabCove();
  windowCatalog();
});
