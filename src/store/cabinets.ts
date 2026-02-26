/*
 * @Description: 
 */

import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

import type { Cabinet } from '~/types/core';
import * as api from '~/services/core';

interface CabinetsStore {
  cabinets: Cabinet[];

  getCabinetsLoading: boolean;
  getCabinets: (spaceId: string) => Promise<Cabinet[]>;

  addCabinetLoading: boolean;
  addCabinet: (cabinet: Cabinet) => Promise<void>;

  delCabinetLoading: boolean;
  delCabinet: (cabinetId: string) => Promise<void>;
};

const cabinetsStore: StateCreator<CabinetsStore> = (set) => ({
  cabinets: [],

  getCabinetsLoading: false,
  getCabinets: async (spaceId) => {
    try {
      set({ getCabinetsLoading: true, });
      const res = await api.getCabinets(spaceId);

      set({ cabinets: res });

      return res;
    } finally {
      set({ getCabinetsLoading: false, });
    }
  },

  addCabinetLoading: false,
  addCabinet: async (cabinet: Cabinet) => {
    try {
      set({ addCabinetLoading: true, });
      await api.addCabinet(cabinet);

      set((state) => {
        return {
          cabinets: [...state.cabinets, cabinet,],
        };
      });
    } finally {
      set({ addCabinetLoading: false, });
    }
  },

  delCabinetLoading: false,
  delCabinet: async (cabinetId: string) => {
    try {
      set({ delCabinetLoading: true, });
      await api.delCabinet(cabinetId);

      set((state) => {
        const tempCabinets = state.cabinets.filter((cabinet) => cabinet._id !== cabinetId);
        return {
          cabinets: tempCabinets,
        };
      });
    } finally {
      set({ delCabinetLoading: false, });
    }
  },
});

export const useCabinetsStore = create<CabinetsStore>()(
  devtools(cabinetsStore, {
    name: 'tabCove_cabinets',
    enabled: import.meta.env.DEV,
  })
);