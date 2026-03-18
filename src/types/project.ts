export interface Project {
  id: number;
  name: string;
  description: string;
  githubRepoUrl: string;
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
