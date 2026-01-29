/*
 * @Description: 
 */

import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

import type { User } from '~/types/core';

interface UsersStore {
  users: User[];
  curUserId: string | undefined;

  getUsersLoading: boolean;
  // getUsers: () => Promise<User[]>;
  setCurUserId: (userId: string) => void;
};

const usersStore: StateCreator<UsersStore> = (set) => ({
  users: [],
  curUserId: undefined,

  getUsersLoading: false,
  // getUsers: async () => {
  //   try {
  //     set({ getUsersLoading: true, });
  //     const res = await api.getCurrentUser();

  //     const { account, } = res.data || {};

  //     set({ userInfo: account });

  //     return res;
  //   } finally {
  //     set({ getUsersLoading: false, });
  //   }
  // },

  setCurUserId: (userId: string) => {
    set({ curUserId: userId, });
  },
});

export const useUserStore = create<UsersStore>()(
  devtools(usersStore, {
    name: 'tabCove_users',
    enabled: import.meta.env.DEV,
  })
);