import apiClient from "../../lib/api-client";
import { Project, AddProjectMemberRequest } from "../../types/project";

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
  }
};

// Also export individual functions to match user's requested style
export const getProjects = projectService.getMyProjects;
export const createProject = projectService.createProject;
