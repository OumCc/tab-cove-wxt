import { nanoid } from 'nanoid';

import type { User, Team, TeamMembership, Space, SpacePermission, Resource, } from '~/types/core';

import { userStorage, teamsStorage, teamMembershipsStorage, spacesStorage, spaceMembershipsStorage, resourcesStorage, } from '~/utils/storage';

export const getUser = async (): Promise<User | null> => {
  return await userStorage.getValue();
};

export const createUser = async (user: User): Promise<void> => {
  await userStorage.setValue(user);
};

export const getTeams = async (): Promise<Team[]> => {
  return await teamsStorage.getValue();
};

export const addTeams = async (team: Team): Promise<void> => {
  const user = await getUser();

  if (!user?._id) {
    throw new Error('用户不存在');
  }

  const teamMemberships = await teamMembershipsStorage.getValue();

  teamMemberships.push({
    _id: nanoid(),
    teamId: team._id,
    userId: user._id,
    role: 'owner',
  });

  await teamMembershipsStorage.setValue(teamMemberships);

  const teams = await getTeams();
  teams.push(team);
  await teamsStorage.setValue(teams);
};

export const delTeams = async (teamId: string): Promise<void> => {
  const teams = await getTeams();
  const index = teams.findIndex((team) => team._id === teamId);
  if (index !== -1) {
    teams.splice(index, 1);
    await teamsStorage.setValue(teams);
  }
};