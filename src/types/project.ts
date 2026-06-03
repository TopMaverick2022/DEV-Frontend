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
  createdAt: string;
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
