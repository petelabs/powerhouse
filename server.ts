import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GitHubService } from './server/github.js';
import { TaskManager } from './server/tasks.js';
import { MemoryService } from './server/memory.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    time: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// GitHub credentials & connection status
app.get('/api/github/status', async (_req: Request, res: Response) => {
  try {
    const status = await GitHubService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/connect', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'GitHub Personal Access Token is required.' });
    }
    const status = await GitHubService.saveCredentials(token.trim());
    res.json(status);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

app.post('/api/github/disconnect', (_req: Request, res: Response) => {
  GitHubService.disconnect();
  res.json({ connected: false });
});

// GitHub Repositories
app.get('/api/github/repos', async (_req: Request, res: Response) => {
  try {
    const repos = await GitHubService.listRepositories();
    res.json(repos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GitHub Branches
app.get('/api/github/branches', async (req: Request, res: Response) => {
  try {
    const repo = req.query.repo as string;
    if (!repo) return res.status(400).json({ error: 'Repo parameter is required' });
    const branches = await GitHubService.listBranches(repo);
    res.json(branches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GitHub Tree
app.get('/api/github/tree', async (req: Request, res: Response) => {
  try {
    const repo = req.query.repo as string;
    const branch = (req.query.branch as string) || 'main';
    if (!repo) return res.status(400).json({ error: 'Repo parameter is required' });
    const tree = await GitHubService.getTree(repo, branch);
    res.json(tree);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GitHub File Content
app.get('/api/github/file', async (req: Request, res: Response) => {
  try {
    const repo = req.query.repo as string;
    const filePath = req.query.path as string;
    const branch = (req.query.branch as string) || 'main';
    if (!repo || !filePath) return res.status(400).json({ error: 'Repo and path are required' });
    const content = await GitHubService.getFileContent(repo, filePath, branch);
    res.json({ content });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Tasks
app.get('/api/tasks', (_req: Request, res: Response) => {
  res.json(TaskManager.getAllTasks());
});

app.get('/api/tasks/:id', (req: Request, res: Response) => {
  const task = TaskManager.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const { prompt, repo, branch, personality, mode, thinkingEnabled } = req.body;
  if (!prompt || !repo) {
    return res.status(400).json({ error: 'Prompt and repo are required' });
  }

  const task = TaskManager.createTask({
    prompt: String(prompt).trim(),
    repo: String(repo).trim(),
    branch: String(branch || 'main').trim(),
    personality: personality || 'builder',
    mode: mode || 'implement',
    thinkingEnabled: !!thinkingEnabled,
  });

  res.status(201).json(task);
});

app.post('/api/tasks/:id/cancel', (req: Request, res: Response) => {
  const success = TaskManager.cancelTask(req.params.id);
  res.json({ success });
});

app.post('/api/tasks/:id/apply', async (req: Request, res: Response) => {
  try {
    const result = await TaskManager.applyTaskChanges(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Project Memory
app.get('/api/memory/:owner/:repo', (req: Request, res: Response) => {
  const repoFullName = `${req.params.owner}/${req.params.repo}`;
  const memory = MemoryService.get(repoFullName);
  res.json(memory);
});

app.put('/api/memory/:owner/:repo', (req: Request, res: Response) => {
  const repoFullName = `${req.params.owner}/${req.params.repo}`;
  const updated = MemoryService.update(repoFullName, req.body);
  res.json(updated);
});

app.delete('/api/memory/:owner/:repo', (req: Request, res: Response) => {
  const repoFullName = `${req.params.owner}/${req.params.repo}`;
  const cleared = MemoryService.clear(repoFullName);
  res.json(cleared);
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Powerhouse server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
