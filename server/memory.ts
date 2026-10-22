import fs from 'fs';
import path from 'path';
import { ProjectMemory } from '../src/types/index.js';

const DATA_DIR = path.resolve(process.cwd(), '.powerhouse-data');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let memoryStore: Record<string, ProjectMemory> = {
  'powerhouse-labs/music-player-react': {
    repo: 'powerhouse-labs/music-player-react',
    framework: 'React 19 + TypeScript + Vite + Tailwind CSS',
    conventions: [
      'Functional components with explicit TypeScript interfaces',
      'Lucide React for technical iconography',
      'Custom hook logic separated from presentation',
      'Dark mode slate color palette (#0F172A)'
    ],
    knownIssues: [
      'Player.tsx fails to reset audio playback currentTime when trackId changes',
      'Missing touch drag scrubber on mobile screens',
    ],
    recentDecisions: [
      {
        date: '2026-10-20',
        decision: 'Migrated from Redux to Zustand for lightweight audio state management.'
      }
    ],
    customNotes: 'Targeting mobile browser audio policies: ensure audio context is unlocked on first user tap.',
    updatedAt: new Date().toISOString(),
  }
};

try {
  if (fs.existsSync(MEMORY_FILE)) {
    const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
    memoryStore = { ...memoryStore, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('Failed to load memory file:', e);
}

function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryStore, null, 2));
  } catch (e) {
    console.error('Failed to save memory file:', e);
  }
}

export class MemoryService {
  static get(repo: string): ProjectMemory {
    if (!memoryStore[repo]) {
      memoryStore[repo] = {
        repo,
        framework: 'TypeScript / Node.js',
        conventions: ['Clean modular architecture', 'Strict type safety'],
        knownIssues: [],
        recentDecisions: [],
        customNotes: '',
        updatedAt: new Date().toISOString(),
      };
      saveMemory();
    }
    return memoryStore[repo];
  }

  static update(repo: string, updates: Partial<ProjectMemory>): ProjectMemory {
    const existing = this.get(repo);
    const updated: ProjectMemory = {
      ...existing,
      ...updates,
      repo,
      updatedAt: new Date().toISOString(),
    };
    memoryStore[repo] = updated;
    saveMemory();
    return updated;
  }

  static addDecision(repo: string, decision: string) {
    const mem = this.get(repo);
    mem.recentDecisions.unshift({
      date: new Date().toISOString().split('T')[0],
      decision,
    });
    if (mem.recentDecisions.length > 10) {
      mem.recentDecisions = mem.recentDecisions.slice(0, 10);
    }
    mem.updatedAt = new Date().toISOString();
    saveMemory();
  }

  static clear(repo: string): ProjectMemory {
    memoryStore[repo] = {
      repo,
      framework: 'Auto-detected on next task',
      conventions: [],
      knownIssues: [],
      recentDecisions: [],
      customNotes: '',
      updatedAt: new Date().toISOString(),
    };
    saveMemory();
    return memoryStore[repo];
  }
}
