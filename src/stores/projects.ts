import { defineStore } from "pinia";

import { cloneJsonValue, type ProjectSnapshot } from "../types/dsq";

interface ProjectsState {
  items: ProjectSnapshot[];
  activeProjectName: string | null;
}

export const useProjectsStore = defineStore("projects", {
  state: (): ProjectsState => ({
    items: [],
    activeProjectName: null,
  }),
  actions: {
    hydrateProjects(projects: ProjectSnapshot[] | undefined) {
      this.items = Array.isArray(projects) ? cloneJsonValue(projects, []) : [];
      this.activeProjectName = this.items.length > 0 ? this.items[0].name : null;
    },
  },
});
