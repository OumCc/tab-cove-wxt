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
  addTeams: (team: Team) => Promise<void>;

  delTeamsLoading: boolean;
  delTeams: (teamId: string) => Promise<void>;
};

const teamsStore: StateCreator<TeamsStore> = (set) => ({
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

      set((state) => {
        const temp: any = {
          teams: res,
        };
        const tempCurTeam = state.curTeam;

        if (!tempCurTeam && res.length) {
          temp.curTeam = res[0];
        }

        return temp;
      });

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
          curTeam: team,
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

      set((state) => {
        const tempTeams = state.teams.filter((team) => team._id !== teamId);
        return {
          teams: tempTeams,
          curTeam: state.curTeam?._id === teamId ? tempTeams[0] : state.curTeam,
        };
      });
    } finally {
      set({ delTeamsLoading: false, });
    }
  },
});

export const useTeamsStore = create<TeamsStore>()(
  devtools(teamsStore, {
    name: 'tabCove_teams',
    enabled: import.meta.env.DEV,
  })
);