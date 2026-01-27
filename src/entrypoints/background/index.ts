import keepAlive from './modules/windowCatalog/keepAlive';
import iconClickOpenTabCove from './modules/iconClickOpenTabCove';
import windowCatalog from './modules/windowCatalog';

export default defineBackground(() => {
  keepAlive();
  iconClickOpenTabCove();
  windowCatalog();
});
