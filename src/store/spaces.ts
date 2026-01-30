/*
 * @Description: 
 */

import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

import type { Space } from '~/types/core';
import * as api from '~/services/core';

interface SpacesStore {
  spaces: Space[];
  curSpace: Space | undefined;

  setCurSpace: (space: Space) => void;

  getSpacesLoading: boolean;
  getSpaces: () => Promise<Space[]>;

  addSpaceLoading: boolean;
  addSpace: (space: Space) => Promise<void>;

  delSpaceLoading: boolean;
  delSpace: (teamId: string) => Promise<void>;
};

const spacesStore: StateCreator<SpacesStore> = (set) => ({
  spaces: [],
  curSpace: undefined,

  setCurSpace: (space: Space) => {
    set({ curSpace: space, });
  },

  getSpacesLoading: false,
  getSpaces: async () => {
    try {
      set({ getSpacesLoading: true, });
      const res = await api.getSpaces();

      set((state) => {
        const temp: any = {
          spaces: res,
        };
        const tempCurSpace = state.curSpace;

        if (!tempCurSpace && res.length) {
          temp.curSpace = res[0];
        }

        return temp;
      });

      return res;
    } finally {
      set({ getSpacesLoading: false, });
    }
  },

  addSpaceLoading: false,
  addSpace: async (space: Space) => {
    try {
      set({ addSpaceLoading: true, });
      await api.addSpace(space);

      set((state) => {
        return {
          spaces: [...state.spaces, space,],
          curSpace: space,
        };
      });
    } finally {
      set({ addSpaceLoading: false, });
    }
  },

  delSpaceLoading: false,
  delSpace: async (teamId: string) => {
    try {
      set({ delSpaceLoading: true, });
      await api.delSpace(teamId);

      set((state) => {
        const tempSpaces = state.spaces.filter((space) => space._id !== teamId);
        return {
          spaces: tempSpaces,
          curSpace: state.curSpace?._id === teamId ? tempSpaces[0] : state.curSpace,
        };
      });
    } finally {
      set({ delSpaceLoading: false, });
    }
  },
});

export const useSpacesStore = create<SpacesStore>()(
  devtools(spacesStore, {
    name: 'tabCove_spaces',
    enabled: import.meta.env.DEV,
  })
);