/*
 * @Description: 全局 store
 */
import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

interface GlobalStore {
  openAddTeamsModal: boolean;
  setOpenAddTeamsModal: (openAddTeamsModal: boolean) => void;

  openCreateAccountModal: boolean;
  setOpenCreateAccountModal: (openCreateAccountModal: boolean) => void;
};

const globalStore: StateCreator<GlobalStore> = (set) => ({
  openAddTeamsModal: false,
  setOpenAddTeamsModal: (openAddTeamsModal) => {
    set({ openAddTeamsModal });
  },

  openCreateAccountModal: false,
  setOpenCreateAccountModal: (openCreateAccountModal) => {
    set({ openCreateAccountModal });
  },
});

export const useGlobalStore = create<GlobalStore>()(
  devtools(globalStore, {
    name: 'tabCove_global',
    enabled: import.meta.env.DEV,
  })
);
