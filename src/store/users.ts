/*
 * @Description: 
 */

import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

import type { User } from '~/types/core';
import * as api from '~/services/core';

interface UsersStore {
  users: User[];
  curUser: User | undefined;

  setCurUser: (user: User) => void;

  getUsersLoading: boolean;
  getUsers: () => Promise<User[]>;

  addUsersLoading: boolean;
  addUsers: (user: User) => Promise<void>;

  delUsersLoading: boolean;
  delUsers: (userId: string) => Promise<void>;
};

const usersStore: StateCreator<UsersStore> = (set) => ({
  users: [],
  curUser: undefined,

  setCurUser: (user: User) => {
    set({ curUser: user, });
  },

  getUsersLoading: false,
  getUsers: async () => {
    try {
      set({ getUsersLoading: true, });
      const res = await api.getUsers();

      set({ users: res });
      return res;
    } finally {
      set({ getUsersLoading: false, });
    }
  },

  addUsersLoading: false,
  addUsers: async (user: User) => {
    try {
      set({ addUsersLoading: true, });
      await api.addUsers(user);

      set((state) => {
        return {
          users: [...state.users, user,],
        };
      });
    } finally {
      set({ addUsersLoading: false, });
    }
  },

  delUsersLoading: false,
  delUsers: async (userId: string) => {
    try {
      set({ delUsersLoading: true, });
      await api.delUsers(userId);

      set((state) => ({ users: state.users.filter((user) => user._id !== userId,), }));
    } finally {
      set({ delUsersLoading: false, });
    }
  },
});

export const useUserStore = create<UsersStore>()(
  devtools(usersStore, {
    name: 'tabCove_users',
    enabled: import.meta.env.DEV,
  })
);