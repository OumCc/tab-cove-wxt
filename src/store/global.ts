/*
 * @Description: 全局 store
 */
import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

interface GlobalStore {
  openAddUsersModal: boolean;
  setOpenAddUsersModal: (openAddUsersModal: boolean) => void;
};

const globalStore: StateCreator<GlobalStore> = (set) => ({
  openAddUsersModal: false,
  setOpenAddUsersModal: (openAddUsersModal) => {
    set({ openAddUsersModal });
  },
});

export const useGlobalStore = create<GlobalStore>()(
  devtools(globalStore, {
    name: 'tabCove_global',
    enabled: import.meta.env.DEV,
  })
);
