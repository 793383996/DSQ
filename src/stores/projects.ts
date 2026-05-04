import { defineStore } from "pinia";

import { normalizeProjectForStorage } from "../services/legacy-storage";
import type { ProjectSnapshot } from "../types/dsq";

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
      this.items = Array.isArray(projects) ? projects.map((project) => normalizeProjectForStorage(project)) : [];
      this.activeProjectName = this.items.length > 0 ? this.items[0].name : null;
    },
    replaceProjects(projects: ProjectSnapshot[] | undefined) {
      this.hydrateProjects(projects);
    },
    selectProject(name: string | null) {
      this.activeProjectName = typeof name === "string" && name ? name : null;
    },
    replaceProject(project: ProjectSnapshot) {
      const normalizedProject = normalizeProjectForStorage(project);
      const index = this.items.findIndex(entry => entry.name === normalizedProject.name);
      if (index >= 0) {
        this.items = this.items.map((entry, entryIndex) => (entryIndex === index ? normalizedProject : entry));
      } else {
        this.items = [...this.items, normalizedProject];
      }
      this.activeProjectName = normalizedProject.name;
    },
    saveProject(name: string, project: Omit<ProjectSnapshot, "name">) {
      this.replaceProject({
        name,
        ...project,
      });
    },
    loadProject(name: string): ProjectSnapshot | null {
      const project = this.items.find(entry => entry.name === name);
      if (!project) {
        return null;
      }
      this.activeProjectName = project.name;
      return normalizeProjectForStorage(project);
    },
    resetProject() {
      this.activeProjectName = null;
    },
    clearProjects() {
      this.items = [];
      this.activeProjectName = null;
    },
  },
});
