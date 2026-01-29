import type { User, Space, SpaceMembership, Resource, } from '~/types/core';
import { remove } from 'lodash-es';

import { usersStorage, } from '~/utils/storage';

export const getUsers = async (): Promise<User[]> => {
  return await usersStorage.getValue();
};

export const addUsers = async (user: User): Promise<void> => {
  const users = await getUsers();
  users.push(user);
  await usersStorage.setValue(users);
};

export const delUsers = async (userId: string): Promise<void> => {
  const users = await getUsers();
  const index = users.findIndex((user) => user._id === userId);
  if (index !== -1) {
    users.splice(index, 1);
    await usersStorage.setValue(users);
  }
};