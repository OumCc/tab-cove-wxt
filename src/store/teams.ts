/*
 * @Description: 
 */

import { create, type StateCreator } from 'zustand';
import { devtools, } from 'zustand/middleware';

import type { Team } from '~/types/core';
import * as api from '~/services/core';

interface TeamsStore {
  teams: Team[];
  curTeam: Team | undefined;

  setCurTeam: (team: Team) => void;

  getTeamsLoading: boolean;
  getTeams: () => Promise<Team[]>;

  addTeamsLoading: boolean;
  addTeams: (user: Team) => Promise<void>;

  delTeamsLoading: boolean;
  delTeams: (userId: string) => Promise<void>;
};

const TeamsStore: StateCreator<TeamsStore> = (set) => ({
  teams: [],
  curTeam: undefined,

  setCurTeam: (team: Team) => {
    set({ curTeam: team, });
  },

  getTeamsLoading: false,
  getTeams: async () => {
    try {
      set({ getTeamsLoading: true, });
      const res = await api.getTeams();

      set({ teams: res });
      return res;
    } finally {
      set({ getTeamsLoading: false, });
    }
  },

  addTeamsLoading: false,
  addTeams: async (team: Team) => {
    try {
      set({ addTeamsLoading: true, });
      await api.addTeams(team);

      set((state) => {
        return {
          teams: [...state.teams, team,],
        };
      });
    } finally {
      set({ addTeamsLoading: false, });
    }
  },

  delTeamsLoading: false,
  delTeams: async (teamId: string) => {
    try {
      set({ delTeamsLoading: true, });
      await api.delTeams(teamId);

      set((state) => ({ teams: state.teams.filter((team) => team._id !== teamId,), }));
    } finally {
      set({ delTeamsLoading: false, });
    }
  },
});

export const useTeamsStore = create<TeamsStore>()(
  devtools(TeamsStore, {
    name: 'tabCove_teams',
    enabled: import.meta.env.DEV,
  })
);