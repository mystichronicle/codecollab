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

export interface GitUserConfigRequest {
  name: string;
  email: string;
  global_config?: boolean;
}

export interface GitCredentialsRequest {
  github_token: string;
  github_username: string;
}

export interface GitUserConfig {
  success: boolean;
  name?: string;
  email?: string;
  scope?: string;
  error?: string;
  message?: string;
}

export interface StashRequest {
  message?: string;
  include_untracked?: boolean;
}

export interface StashApplyRequest {
  stash_index?: number;
}

export interface CommitLogRequest {
  max_count?: number;
  branch?: string;
}

export interface Commit {
  hash: string;
  short_hash: string;
  author: string;
  email: string;
  message: string;
  date: string;
  parent_count: number;
}

export interface CommitLog {
  success: boolean;
  commits: Commit[];
  count: number;
}

export interface DiffRequest {
  commit1?: string;
  commit2?: string;
  file_path?: string;
}

export interface DiffResult {
  success: boolean;
  diff: string;
}

export interface MergeRequest {
  branch_name: string;
  commit_message?: string;
}

export interface ResetRequest {
  mode?: 'soft' | 'mixed' | 'hard';
  commit?: string;
}

export interface TagRequest {
  tag_name: string;
  message?: string;
  commit?: string;
}

export interface TagList {
  success: boolean;
  tags: string[];
  count: number;
}

export interface StashList {
  success: boolean;
  stashes: string[];
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

  // New Git operations

  async configureUser(sessionId: string, request: GitUserConfigRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/config/user/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getUserConfig(sessionId: string): Promise<GitUserConfig> {
    const response = await axios.get(
      `${API_BASE_URL}/git/config/user/${sessionId}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async configureCredentials(sessionId: string, request: GitCredentialsRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/config/credentials/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async stashChanges(sessionId: string, request: StashRequest = {}) {
    const response = await axios.post(
      `${API_BASE_URL}/git/stash/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async listStashes(sessionId: string): Promise<StashList> {
    const response = await axios.get(
      `${API_BASE_URL}/git/stash/list/${sessionId}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async applyStash(sessionId: string, request: StashApplyRequest = {}) {
    const response = await axios.post(
      `${API_BASE_URL}/git/stash/apply/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async popStash(sessionId: string, request: StashApplyRequest = {}) {
    const response = await axios.post(
      `${API_BASE_URL}/git/stash/pop/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getCommitLog(sessionId: string, request: CommitLogRequest = {}): Promise<CommitLog> {
    const response = await axios.post(
      `${API_BASE_URL}/git/log/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getDiff(sessionId: string, request: DiffRequest = {}): Promise<DiffResult> {
    const response = await axios.post(
      `${API_BASE_URL}/git/diff/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async mergeBranch(sessionId: string, request: MergeRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/merge/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async reset(sessionId: string, request: ResetRequest = {}) {
    const response = await axios.post(
      `${API_BASE_URL}/git/reset/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async createTag(sessionId: string, request: TagRequest) {
    const response = await axios.post(
      `${API_BASE_URL}/git/tags/${sessionId}`,
      request,
      this.getAuthHeader()
    );
    return response.data;
  }

  async listTags(sessionId: string): Promise<TagList> {
    const response = await axios.get(
      `${API_BASE_URL}/git/tags/list/${sessionId}`,
      this.getAuthHeader()
    );
    return response.data;
  }
}

export const gitService = new GitService();
