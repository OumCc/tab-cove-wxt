import type { Team, Space, SpaceMembership, Resource, } from '~/types/core';

import { teamsStorage, } from '~/utils/storage';

export const getTeams = async (): Promise<Team[]> => {
  return await teamsStorage.getValue();
};

export const addTeams = async (team: Team): Promise<void> => {
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