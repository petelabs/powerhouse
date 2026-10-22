export type PersonalityId = 'architect' | 'builder' | 'debugger' | 'reviewer';

export interface PersonalityConfig {
  id: PersonalityId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  accentColor: string;
}

export type TaskMode = 'ask' | 'plan' | 'implement';

export type TaskStatus = 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  stage: string;
  level: 'info' | 'stage' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  codeSnippet?: string;
}

export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  explanation: string;
  originalContent?: string;
  newContent?: string;
  diffHunk?: string;
}

export interface FinalReport {
  summary: string;
  filesChangedCount: number;
  filesActuallyChanged: string[];
  executedCommands: string[];
  testResults: {
    status: 'passed' | 'failed' | 'skipped' | 'not_configured';
    summary: string;
    details?: string;
  };
  deploymentStatus: 'pending' | 'deployed' | 'not_applicable' | 'failed';
  unresolvedIssues: string[];
  branchName?: string;
  prUrl?: string;
  verifiedAt: string;
}

export interface CodingTask {
  id: string;
  title: string;
  prompt: string;
  repo: string;
  branch: string;
  personality: PersonalityId;
  mode: TaskMode;
  thinkingEnabled: boolean;
  modelUsed: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  events: ActivityEvent[];
  proposedChanges: FileChange[];
  finalReport?: FinalReport;
  rawResponse?: string;
  errorMessage?: string;
  branchName?: string;
  prUrl?: string;
}

export interface RepoItem {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  language: string | null;
  updatedAt: string;
  starsCount: number;
  openIssuesCount: number;
}

export interface RepoBranch {
  name: string;
  isDefault: boolean;
  protected: boolean;
}

export interface RepoFileNode {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}

export interface GitHubAccountStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  name?: string;
  scopes?: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: string;
  };
  isFineGrained?: boolean;
}

export interface ProjectMemory {
  repo: string;
  framework: string;
  conventions: string[];
  knownIssues: string[];
  recentDecisions: Array<{
    date: string;
    decision: string;
  }>;
  customNotes: string;
  updatedAt: string;
}

export interface AppSettings {
  dataSaver: boolean;
  defaultPersonality: PersonalityId;
  highThinkingByDefault: boolean;
  preferredModel: string;
}
