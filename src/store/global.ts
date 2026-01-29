/*
 * @Description: 全局 store
 */
import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

interface GlobalStore {
  openAddTeamsModal: boolean;
  setOpenAddTeamsModal: (openAddTeamsModal: boolean) => void;
};

const globalStore: StateCreator<GlobalStore> = (set) => ({
  openAddTeamsModal: false,
  setOpenAddTeamsModal: (openAddTeamsModal) => {
    set({ openAddTeamsModal });
  },
});

export const useGlobalStore = create<GlobalStore>()(
  devtools(globalStore, {
    name: 'tabCove_global',
    enabled: import.meta.env.DEV,
  })
);
