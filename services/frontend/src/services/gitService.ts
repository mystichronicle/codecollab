import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface GitCloneRequest {
  repo_url: string;
  branch?: string;
}

export interface GitCommitRequest {
  message: string;
  files?: string[];
}

export interface GitBranchRequest {
  branch_name: string;
  checkout?: boolean;
}

export interface GitCheckoutRequest {
  branch_name: string;
}

export interface GitPushRequest {
  remote?: string;
  branch?: string;
}

export interface GitPullRequest {
  remote?: string;
  branch?: string;
}

export interface GitFileReadRequest {
  file_path: string;
}

export interface GitFileWriteRequest {
  file_path: string;
  content: string;
}

export interface GitStatus {
  success: boolean;
  branch: string;
  modified: string[];
  untracked: string[];
  staged: string[];
  is_dirty: boolean;
  commit_count: number;
}

export interface GitBranches {
  success: boolean;
  branches: string[];
  current_branch: string;
}

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeItem[];
}

export interface GitFileTree {
  success: boolean;
  tree: FileTreeItem[];
}

export interface GitFileContent {
  success: boolean;
  content: string;
  path: string;
}

export interface GitWorkspace {
  workspace_id: string;
  name: string;
  path: string;
  branch: string;
  remote_url: string | null;
  is_dirty: boolean;
  commit_count: number;
}

export interface GitWorkspaceList {
  success: boolean;
  workspaces: GitWorkspace[];
}

export class GitService {
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  async listWorkspaces(): Promise<GitWorkspaceList> {
    const response = await axios.get(
      `${API_BASE_URL}/git/workspaces`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async cloneRepository(sessionId: string, request: GitCloneRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/clone/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getStatus(sessionId: string): Promise<GitStatus> {
    const response = await axios.get(
      `${API_BASE_URL}/git/status/${sessionId}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async commitChanges(sessionId: string, request: GitCommitRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/commit/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async pushChanges(sessionId: string, request: GitPushRequest = {}) {
    const response = await axios.post(
      `${API_BASE_URL}/git/push/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async pullChanges(sessionId: string, request: GitPullRequest = {}) {
    const response = await axios.post(
      `${API_BASE_URL}/git/pull/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async listBranches(sessionId: string): Promise<GitBranches> {
    const response = await axios.get(
      `${API_BASE_URL}/git/branches/${sessionId}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async createBranch(sessionId: string, request: GitBranchRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/branches/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async checkoutBranch(sessionId: string, request: GitCheckoutRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/checkout/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getFileTree(sessionId: string): Promise<GitFileTree> {
    const response = await axios.get(
      `${API_BASE_URL}/git/tree/${sessionId}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async readFile(sessionId: string, request: GitFileReadRequest): Promise<GitFileContent> {
    const response = await axios.post(
      `${API_BASE_URL}/git/files/read/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async writeFile(sessionId: string, request: GitFileWriteRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/files/write/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }
}

export const gitService = new GitService();
