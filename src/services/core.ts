import { nanoid } from 'nanoid';

import type { User, Team, TeamMembership, Space, SpacePermission, Cabinet, } from '~/types/core';

import { userStorage, teamsStorage, teamMembershipsStorage, spacesStorage, spacePermissionsStorage, cabinetsStorage, } from '~/utils/storage';

export const getUser = async (): Promise<User | null> => {
  return await userStorage.getValue();
};

export const createUser = async (user: User): Promise<void> => {
  await userStorage.setValue(user);
};

export const getTeams = async (): Promise<Team[]> => {
  const user = await getUser();

  if (!user?._id) {
    throw new Error('用户不存在');
  }

  const teamMemberships = await teamMembershipsStorage.getValue();
  const ownTeams = teamMemberships.filter((teamMembership) => teamMembership.userId === user._id);
  const allTeams = await teamsStorage.getValue();

  return allTeams.filter((team) => ownTeams.some((ownTeam) => ownTeam.teamId === team._id));
};

export const addTeam = async (team: Team): Promise<void> => {
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

export const delTeam = async (teamId: string): Promise<void> => {
  const teams = await getTeams();
  const index = teams.findIndex((team) => team._id === teamId);

  // FIXME: 按理这里要检查需要删除的 team 是否属于当前用户，但目前是离线版，暂时没有这个必要

  if (index !== -1) {
    teams.splice(index, 1);
    await teamsStorage.setValue(teams);
  }
};

export const getSpaces = async (teamId: string): Promise<Space[]> => {
  const user = await getUser();

  if (!user?._id) {
    throw new Error('用户不存在');
  }

  const allSpacePermissions = await spacePermissionsStorage.getValue();
  const allSpaces = await spacesStorage.getValue();
  const result: Space[] = [];

  allSpaces.forEach((space) => {
    if (space.teamId === teamId) {
      switch (space.visibility) {
        case 'public':
          result.push(space);
          break;
        case 'protected':
          if (allSpacePermissions.some((permission) => permission.spaceId === space._id && permission.userId === user._id)) {
            result.push(space);
          }
          break;
        case 'private':
          if (space.createdBy === user._id) {
            result.push(space);
          }
          break;
        default:
          break;
      }
    }
  });

  return result;
};

export const addSpace = async (space: Omit<Space, 'createdBy'>): Promise<Space> => {
  const user = await getUser();

  if (!user?._id) {
    throw new Error('用户不存在');
  }

  const newSpace = {
    ...space,
    createdBy: user._id,
  };

  const allSpacePermissions = await spacePermissionsStorage.getValue();
  const allSpaces = await spacesStorage.getValue();

  allSpacePermissions.push({
    _id: nanoid(),
    spaceId: newSpace._id,
    userId: user._id,
  });
  allSpaces.push(newSpace);
  
  await spacePermissionsStorage.setValue(allSpacePermissions);
  await spacesStorage.setValue(allSpaces);

  return newSpace;
};

export const delSpace = async (spaceId: string): Promise<void> => {
  const spaces = await spacesStorage.getValue();
  const index = spaces.findIndex((space) => space._id === spaceId);
  if (index !== -1) {
    spaces.splice(index, 1);
    await spacesStorage.setValue(spaces);
  }
};

export const getCabinets = async (spaceId: string): Promise<Cabinet[]> => {
  const allCabinets = await cabinetsStorage.getValue();
  return allCabinets.filter((cabinet) => cabinet.spaceId === spaceId);
};

export const addCabinet = async (cabinet: Cabinet): Promise<void> => {
  const allCabinets = await cabinetsStorage.getValue();
  allCabinets.push(cabinet);
  await cabinetsStorage.setValue(allCabinets);
};

export const delCabinet = async (cabinetId: string): Promise<void> => {
  const allCabinets = await cabinetsStorage.getValue();
  const index = allCabinets.findIndex((cabinet) => cabinet._id === cabinetId);
  if (index !== -1) {
    allCabinets.splice(index, 1);
    await cabinetsStorage.setValue(allCabinets);
  }
};