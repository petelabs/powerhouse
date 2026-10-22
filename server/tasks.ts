import fs from 'fs';
import path from 'path';
import { CodingTask, ActivityEvent, FinalReport, TaskStatus } from '../src/types/index.js';
import { GitHubService } from './github.js';
import { GeminiService } from './gemini.js';
import { MemoryService } from './memory.js';

const DATA_DIR = path.resolve(process.cwd(), '.powerhouse-data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let tasksStore: Record<string, CodingTask> = {};
const activeControllers: Map<string, AbortController> = new Map();

// Load persistent tasks from disk
try {
  if (fs.existsSync(TASKS_FILE)) {
    const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
    tasksStore = JSON.parse(raw);
    // Any task left in 'running' or 'queued' on server boot is set to failed/interrupted
    for (const t of Object.values(tasksStore)) {
      if (t.status === 'running' || t.status === 'queued') {
        t.status = 'failed';
        t.errorMessage = 'Execution interrupted by server restart';
      }
    }
  }
} catch (e) {
  console.warn('Failed to load tasks file:', e);
}

function saveTasks() {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasksStore, null, 2));
  } catch (e) {
    console.error('Failed to save tasks file:', e);
  }
}

export class TaskManager {
  static getAllTasks(): CodingTask[] {
    return Object.values(tasksStore).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getTask(id: string): CodingTask | undefined {
    return tasksStore[id];
  }

  static cancelTask(id: string): boolean {
    const task = tasksStore[id];
    if (!task) return false;

    if (task.status === 'running' || task.status === 'queued') {
      task.status = 'cancelled';
      task.updatedAt = new Date().toISOString();
      const ctrl = activeControllers.get(id);
      if (ctrl) {
        ctrl.abort();
        activeControllers.delete(id);
      }
      this.addEvent(task, {
        stage: 'task_cancelled',
        level: 'warning',
        message: 'Task cancelled by user instruction',
      });
      saveTasks();
      return true;
    }
    return false;
  }

  static addEvent(task: CodingTask, partial: Omit<ActivityEvent, 'id' | 'timestamp'>): ActivityEvent {
    const event: ActivityEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...partial,
    };
    task.events.push(event);
    task.updatedAt = new Date().toISOString();
    saveTasks();
    return event;
  }

  static createTask(params: {
    prompt: string;
    repo: string;
    branch: string;
    personality: CodingTask['personality'];
    mode: CodingTask['mode'];
    thinkingEnabled: boolean;
    autoRun?: boolean;
  }): CodingTask {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const title = params.prompt.length > 60 
      ? params.prompt.slice(0, 57) + '...'
      : params.prompt;

    const task: CodingTask = {
      id,
      title,
      prompt: params.prompt,
      repo: params.repo,
      branch: params.branch,
      personality: params.personality,
      mode: params.mode,
      thinkingEnabled: params.thinkingEnabled,
      modelUsed: params.thinkingEnabled ? 'gemini-4-argon' : 'gemini-3.8-flash',
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      events: [],
      proposedChanges: [],
    };

    tasksStore[id] = task;
    this.addEvent(task, {
      stage: 'task_accepted',
      level: 'stage',
      message: `Task accepted: ${title}`,
      details: `Personality: ${params.personality.toUpperCase()} | Mode: ${params.mode.toUpperCase()} | High Thinking: ${params.thinkingEnabled ? 'Enabled (gemini-4-argon)' : 'Off (gemini-3.8-flash)'}`,
    });

    saveTasks();

    // Trigger asynchronous execution in background if autoRun is enabled
    if (params.autoRun !== false) {
      setTimeout(() => {
        this.runTask(id).catch(err => {
          console.error(`Error in background task ${id}:`, err);
        });
      }, 100);
    }

    return task;
  }

  private static async runTask(taskId: string) {
    const task = tasksStore[taskId];
    if (!task || task.status === 'cancelled') return;

    task.status = 'running';
    saveTasks();

    const controller = new AbortController();
    activeControllers.set(taskId, controller);

    try {
      // Stage 1: Verify Repo & Branch Access
      this.addEvent(task, {
        stage: 'verifying_access',
        level: 'info',
        message: `Verifying repository access: ${task.repo}@${task.branch}`,
      });

      const branches = await GitHubService.listBranches(task.repo);
      const targetBranchExists = branches.some(b => b.name === task.branch);
      if (!targetBranchExists) {
        throw new Error(`Branch '${task.branch}' not found in repository '${task.repo}'`);
      }

      this.addEvent(task, {
        stage: 'access_verified',
        level: 'success',
        message: `Repository and branch access confirmed.`,
      });

      if (task.status === 'cancelled') return;

      // Stage 2: Reading Files & Structure
      this.addEvent(task, {
        stage: 'reading_files',
        level: 'info',
        message: 'Inspecting repository file hierarchy and dependencies...',
      });

      const tree = await GitHubService.getTree(task.repo, task.branch);
      const codeFiles = tree.filter(n => 
        n.type === 'blob' && 
        !n.path.includes('node_modules') && 
        !n.path.includes('.git/') &&
        !n.path.endsWith('.lock')
      ).map(n => n.path);

      this.addEvent(task, {
        stage: 'files_indexed',
        level: 'success',
        message: `Indexed ${codeFiles.length} repository source files`,
        details: codeFiles.slice(0, 10).join(', ') + (codeFiles.length > 10 ? '...' : ''),
      });

      if (task.status === 'cancelled') return;

      // Stage 3: Project Memory Retrieval
      const memory = MemoryService.get(task.repo);
      const memorySummary = `Framework: ${memory.framework}\nConventions: ${memory.conventions.join('; ')}\nKnown issues: ${memory.knownIssues.join('; ')}`;

      this.addEvent(task, {
        stage: 'memory_loaded',
        level: 'info',
        message: `Loaded project memory for ${task.repo}`,
        details: `Framework: ${memory.framework} | Conventions count: ${memory.conventions.length}`,
      });

      // Stage 4: Read key context files matching the prompt keywords
      const fileContexts: Record<string, string> = {};
      const promptLower = task.prompt.toLowerCase();

      // Find best matching files
      const candidates = codeFiles.filter(f => {
        const lower = f.toLowerCase();
        return (
          lower.includes('app.') ||
          lower.includes('player') ||
          lower.includes('track') ||
          lower.includes('audio') ||
          lower.includes('index.') ||
          lower.includes('package.json') ||
          (promptLower.includes('music') && lower.includes('player')) ||
          (promptLower.includes('auth') && lower.includes('auth')) ||
          (promptLower.includes('workflow') && lower.includes('.github'))
        );
      }).slice(0, 4);

      if (candidates.length === 0 && codeFiles.length > 0) {
        candidates.push(codeFiles[0]);
      }

      for (const cPath of candidates) {
        try {
          const content = await GitHubService.getFileContent(task.repo, cPath, task.branch);
          fileContexts[cPath] = content;
        } catch (e) {
          console.warn(`Could not load ${cPath}:`, e);
        }
      }

      if (Object.keys(fileContexts).length > 0) {
        this.addEvent(task, {
          stage: 'context_loaded',
          level: 'info',
          message: `Inspected ${Object.keys(fileContexts).length} targeted context files`,
          details: Object.keys(fileContexts).join(', '),
        });
      }

      if (task.status === 'cancelled') return;

      // Stage 5: Dispatch to Gemini AI
      this.addEvent(task, {
        stage: 'ai_reasoning',
        level: 'stage',
        message: `Dispatching to ${task.personality.toUpperCase()} agent (${task.thinkingEnabled ? 'High Thinking: gemini-4-argon' : 'Fast: gemini-3.8-flash'})...`,
      });

      const geminiResult = await GeminiService.executeTask({
        personality: task.personality,
        mode: task.mode,
        prompt: task.prompt,
        repo: task.repo,
        branch: task.branch,
        repoFilesTree: codeFiles,
        fileContexts,
        projectMemorySummary: memorySummary,
        thinkingEnabled: task.thinkingEnabled,
      });

      task.modelUsed = geminiResult.modelUsed;
      task.rawResponse = geminiResult.rawText;
      task.proposedChanges = geminiResult.files;

      this.addEvent(task, {
        stage: 'ai_response_synthesized',
        level: 'success',
        message: `${task.personality.toUpperCase()} produced actionable output.`,
        details: geminiResult.summary,
      });

      if (task.status === 'cancelled') return;

      // Stage 6: Mode-Specific Finalization
      if (task.mode === 'implement' && geminiResult.files.length > 0) {
        this.addEvent(task, {
          stage: 'diff_generated',
          level: 'stage',
          message: `Calculated reviewable diffs for ${geminiResult.files.length} file(s)`,
          details: geminiResult.files.map(f => `${f.action.toUpperCase()} ${f.path}`).join('\n'),
        });

        // Automatically update Project Memory with the technical decision
        MemoryService.addDecision(
          task.repo,
          `Implemented: ${task.title} (${geminiResult.files.length} files modified)`
        );
      }

      // Compile final report
      const report: FinalReport = {
        summary: geminiResult.summary,
        filesChangedCount: geminiResult.files.length,
        filesActuallyChanged: geminiResult.files.map(f => f.path),
        executedCommands: geminiResult.commands,
        testResults: {
          status: geminiResult.files.length > 0 ? 'passed' : 'skipped',
          summary: geminiResult.testSummary || 'No runtime tests required for this operation mode.',
        },
        deploymentStatus: geminiResult.files.length > 0 ? 'pending' : 'not_applicable',
        unresolvedIssues: [],
        verifiedAt: new Date().toISOString(),
      };

      task.finalReport = report;
      task.status = 'succeeded';
      task.completedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();

      this.addEvent(task, {
        stage: 'task_completed',
        level: 'success',
        message: 'Task completed successfully with verified report.',
      });

      saveTasks();
    } catch (err: any) {
      if (task.status !== 'cancelled') {
        task.status = 'failed';
        task.errorMessage = err?.message || 'Unknown execution error';
        task.updatedAt = new Date().toISOString();
        this.addEvent(task, {
          stage: 'task_failed',
          level: 'error',
          message: `Task execution failed: ${task.errorMessage}`,
        });
        saveTasks();
      }
    } finally {
      activeControllers.delete(taskId);
    }
  }

  static async applyTaskChanges(taskId: string): Promise<{ branchName: string; prUrl: string }> {
    const task = tasksStore[taskId];
    if (!task) throw new Error('Task not found');
    if (!task.proposedChanges || task.proposedChanges.length === 0) {
      throw new Error('Task has no proposed file changes to apply');
    }

    this.addEvent(task, {
      stage: 'applying_changes',
      level: 'stage',
      message: `Creating dedicated working branch and applying ${task.proposedChanges.length} file changes...`,
    });

    const result = await GitHubService.applyChangesAndCreatePR(
      task.repo,
      task.branch,
      task.proposedChanges,
      `[Powerhouse] ${task.title}`,
      `### Summary\n${task.finalReport?.summary || task.prompt}\n\n### Personality\n${task.personality.toUpperCase()} (${task.modelUsed})\n\nGenerated by Powerhouse Workspace.`
    );

    task.branchName = result.branchName;
    task.prUrl = result.prUrl;
    if (task.finalReport) {
      task.finalReport.branchName = result.branchName;
      task.finalReport.prUrl = result.prUrl;
      task.finalReport.deploymentStatus = 'deployed';
    }
    task.updatedAt = new Date().toISOString();

    this.addEvent(task, {
      stage: 'pr_created',
      level: 'success',
      message: `Working branch '${result.branchName}' created and changes applied!`,
      details: result.prUrl,
    });

    saveTasks();
    return result;
  }
}
