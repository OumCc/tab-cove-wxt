/*
 * @Description: 
 */

import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

interface UsersStore {
  // userInfo: any;
  // getCurrentUserLoading: boolean;
};

const usersStore: StateCreator<UsersStore> = () => ({
  // userInfo: null, // 暂时用不上这个用户信息，getCurrentUser目前只是用来判断是否登录态是否失效
  // getCurrentUserLoading: false,
  // getCurrentUser: async () => {
  //   try {
  //     set({ getCurrentUserLoading: true, });
  //     const res = await api.getCurrentUser();

  //     const { account, } = res.data || {};

  //     set({ userInfo: account });

  //     return res;
  //   } finally {
  //     set({ getCurrentUserLoading: false, });
  //   }
  // },
});

export const useUserStore = create<UsersStore>()(
  devtools(usersStore, {
    name: 'tabCove_users',
    enabled: import.meta.env.DEV,
  })
);