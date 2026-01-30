/*
 * @Description: 
 */

import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

import type { User } from '~/types/core';
import * as api from '~/services/core';

interface UserStore {
  user: User | null;

  getUserLoading: boolean;
  getUser: () => Promise<User | null>;

  createUserLoading: boolean;
  createUser: (user: User) => Promise<void>;
};

const userStore: StateCreator<UserStore> = (set) => ({
  user: null,

  getUserLoading: false,
  getUser: async () => {
    try {
      set({ getUserLoading: true, });
      const res = await api.getUser();
      set({ user: res, });
      return res;
    }
    finally {
      set({ getUserLoading: false, });
    }
  },

  createUserLoading: false,
  createUser: async (user: User) => {
    try {
      set({ createUserLoading: true, });
      await api.createUser(user);
      set({ user, });
    }
    finally {
      set({ createUserLoading: false, });
    }
  },
});

export const useUserStore = create<UserStore>()(
  devtools(userStore, {
    name: 'tabCove_user',
    enabled: import.meta.env.DEV,
  })
);