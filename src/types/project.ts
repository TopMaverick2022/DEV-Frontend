export type ProjectType = 'STANDALONE' | 'FRONTEND' | 'BACKEND'

export interface Project {
  id: number;
  name: string;
  description: string;
  githubRepoUrl: string;
  language?: string;
  languageVersion?: string;
  framework?: string;
  frameworkVersion?: string;
  databaseName?: string;
  databaseVersion?: string;
  dependencies?: string;
  aiBusinessContext?: string;
  createdAt: string;
  /** STANDALONE = normal single-repo project; FRONTEND/BACKEND = paired projects */
  projectType?: ProjectType;
  /** ID of the linked companion project (null for STANDALONE) */
  relatedProjectId?: number;
  owner?: {
    id: number;
    username: string;
    email: string;
  };
}

export interface AddProjectMemberRequest {
  username: string;
  role: string;
}
