import apiClient from "../../lib/api-client";
import { Project, ProjectType, AddProjectMemberRequest } from "../../types/project";

export const projectService = {
  async createProject(project: Partial<Project>): Promise<Project> {
    const response = await apiClient.post<Project>("/projects", project);
    return response.data;
  },

  async getMyProjects(): Promise<Project[]> {
    const response = await apiClient.get<Project[]>("/projects");
    return response.data;
  },

  async deleteProject(id: number): Promise<string> {
    const response = await apiClient.delete<string>(`/projects/${id}`);
    return response.data;
  },

  async updateProjectSettings(id: number, project: Partial<Project>): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${id}/settings`, project);
    return response.data;
  },

  async addProjectMember(projectId: number, request: AddProjectMemberRequest): Promise<string> {
    const response = await apiClient.post<string>(`/projects/${projectId}/members`, request);
    return response.data;
  },

  async getProjectMembers(projectId: number): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/projects/${projectId}/members`);
    return response.data;
  },

  /**
   * Links two projects bidirectionally.
   * projectType determines whether this project is FRONTEND or BACKEND.
   */
  async linkProjects(
    projectId: number,
    relatedProjectId: number,
    projectType: ProjectType
  ): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${projectId}/link`, {
      relatedProjectId,
      projectType,
    });
    return response.data;
  },

  /**
   * Removes the link on both sides, resetting both to STANDALONE.
   */
  async unlinkProject(projectId: number): Promise<Project> {
    const response = await apiClient.delete<Project>(`/projects/${projectId}/link`);
    return response.data;
  },

  /**
   * Returns the companion project if linked, or null.
   */
  async getLinkedProject(projectId: number): Promise<Project | null> {
    try {
      const response = await apiClient.get<Project>(`/projects/${projectId}/linked`);
      return response.data;
    } catch {
      return null;
    }
  },
};

// Also export individual functions to match user's requested style
export const getProjects = projectService.getMyProjects;
export const createProject = projectService.createProject;
