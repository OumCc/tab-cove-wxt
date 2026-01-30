/*
 * @Description: 全局 store
 */
import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

interface GlobalStore {
  openCreateAccountModal: boolean;
  setOpenCreateAccountModal: (openCreateAccountModal: boolean) => void;

  openAddTeamsModal: boolean;
  setOpenAddTeamsModal: (openAddTeamsModal: boolean) => void;

  openAddSpacesModal: boolean;
  setOpenAddSpacesModal: (openAddSpacesModal: boolean) => void;

  openAddCabinetModal: boolean;
  setOpenAddCabinetModal: (openAddCabinetModal: boolean) => void;
};

const globalStore: StateCreator<GlobalStore> = (set) => ({
  openCreateAccountModal: false,
  setOpenCreateAccountModal: (openCreateAccountModal) => {
    set({ openCreateAccountModal });
  },

  openAddTeamsModal: false,
  setOpenAddTeamsModal: (openAddTeamsModal) => {
    set({ openAddTeamsModal });
  },

  openAddSpacesModal: false,
  setOpenAddSpacesModal: (openAddSpacesModal) => {
    set({ openAddSpacesModal });
  },

  openAddCabinetModal: false,
  setOpenAddCabinetModal: (openAddCabinetModal) => {
    set({ openAddCabinetModal });
  },
});

export const useGlobalStore = create<GlobalStore>()(
  devtools(globalStore, {
    name: 'tabCove_global',
    enabled: import.meta.env.DEV,
  })
);
