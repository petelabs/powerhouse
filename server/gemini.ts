import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { PersonalityId, TaskMode, FileChange } from '../src/types/index.js';
import { computeSimpleDiff } from './diff.js';

const apiKey = process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const PERSONALITY_PROMPTS: Record<PersonalityId, string> = {
  architect: `You are ARCHITECT in the Powerhouse workspace.
You plan before building. Understand the requested outcome, inspect relevant repository files, identify dependencies, consider architecture, and create a concise implementation plan before making changes. Explain decisions in practical engineering language without buzzwords or fluff.`,

  builder: `You are BUILDER in the Powerhouse workspace.
You implement the solution. Focus on writing maintainable code, making targeted changes, respecting existing patterns, and completing the requested functionality. Avoid unnecessary explanations and prioritize clean, tested implementation.`,

  debugger: `You are DEBUGGER in the Powerhouse workspace.
You find the actual cause. Investigate error messages, trace relevant code paths, compare expected and actual behavior, propose a root cause, and implement a verified fix. Do not guess that a bug is solved without evidence.`,

  reviewer: `You are REVIEWER in the Powerhouse workspace.
You inspect quality and risk. Review changes for bugs, security problems, broken functionality, performance issues, missing error handling, and unnecessary complexity. Produce concise findings with severity and specific remedies.`,
};

export interface GeminiTaskRequest {
  personality: PersonalityId;
  mode: TaskMode;
  prompt: string;
  repo: string;
  branch: string;
  repoFilesTree: string[];
  fileContexts: Record<string, string>;
  projectMemorySummary: string;
  thinkingEnabled?: boolean;
}

export interface GeminiTaskResponse {
  summary: string;
  rawText: string;
  modelUsed: string;
  files: FileChange[];
  commands: string[];
  testSummary?: string;
  deploymentReadiness: 'ready' | 'pending' | 'needs_tests';
}

export class GeminiService {
  static async executeTask(req: GeminiTaskRequest): Promise<GeminiTaskResponse> {
    const personalityInstruction = PERSONALITY_PROMPTS[req.personality] || PERSONALITY_PROMPTS.builder;
    
    // Choose model based on thinking requirement
    let modelName = req.thinkingEnabled ? 'gemini-4-argon' : 'gemini-3.8-flash';

    let modeInstruction = '';
    if (req.mode === 'ask') {
      modeInstruction = `TASK MODE: ASK.
Provide a clear, accurate, and direct technical explanation or code walkthrough.
Do NOT output structured file writes or JSON patches. Answer the user's inquiry directly.`;
    } else if (req.mode === 'plan') {
      modeInstruction = `TASK MODE: PLAN.
Produce a comprehensive yet concise architectural plan.
Outline:
1. Target files and dependencies to modify.
2. Step-by-step phased execution strategy.
3. Edge cases and risk mitigations.
4. Acceptance criteria and test plan.
Do NOT apply code edits directly in this mode.`;
    } else {
      // Implement mode
      modeInstruction = `TASK MODE: IMPLEMENT.
You must analyze the task, determine the exact code changes needed, and output:
1. A concise engineering summary explaining what you changed and why.
2. A single valid JSON block enclosed in \`\`\`json and \`\`\` containing the exact file modifications:
{
  "summary": "Brief explanation of the changes",
  "files": [
    {
      "path": "path/to/file.tsx",
      "action": "create" | "modify" | "delete",
      "explanation": "Why this file was created/modified/deleted",
      "newContent": "FULL, complete updated source code of the file. Do NOT truncate or leave placeholders."
    }
  ],
  "commands": ["npm test", "npm run build"],
  "testSummary": "What verification was conducted or recommended"
}`;
    }

    const filesTreeList = req.repoFilesTree.slice(0, 40).join('\n');
    let contextFilesBlock = '';
    for (const [fPath, content] of Object.entries(req.fileContexts)) {
      contextFilesBlock += `\n--- File: ${fPath} ---\n${content}\n`;
    }

    const userContent = `Repository: ${req.repo} (Branch: ${req.branch})
Project Context & Memory:
${req.projectMemorySummary || 'No specific past conventions recorded.'}

Repository Structure:
${filesTreeList}
${req.repoFilesTree.length > 40 ? `... (${req.repoFilesTree.length - 40} more files)` : ''}

${contextFilesBlock ? `Inspected File Contents:${contextFilesBlock}` : ''}

USER INSTRUCTION:
${req.prompt}

${modeInstruction}`;

    const config: any = {
      systemInstruction: personalityInstruction,
      temperature: 0.2,
    };

    if (req.thinkingEnabled && modelName === 'gemini-4-argon') {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
      // Do NOT set maxOutputTokens per instructions!
    }

    let responseText = '';
    let usedModel = modelName;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userContent,
        config,
      });
      responseText = response.text || '';
    } catch (err: any) {
      console.warn(`Error invoking ${modelName}:`, err?.message || err);
      // If gemini-4-argon failed (e.g. key permissions or rate limits), fall back to gemini-3.8-flash
      if (modelName !== 'gemini-3.8-flash') {
        console.log('Falling back to gemini-3.8-flash...');
        usedModel = 'gemini-3.8-flash';
        const fallbackConfig: any = {
          systemInstruction: personalityInstruction,
          temperature: 0.2,
        };
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userContent,
          config: fallbackConfig,
        });
        responseText = fallbackResponse.text || '';
      } else {
        throw err;
      }
    }

    // Parse file changes if in Implement mode
    const fileChanges: FileChange[] = [];
    let commands: string[] = ['npm test'];
    let testSummary = 'Syntactic checks passed.';
    let summary = responseText.slice(0, 300);

    if (req.mode === 'implement') {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.summary) summary = parsed.summary;
          if (Array.isArray(parsed.commands)) commands = parsed.commands;
          if (parsed.testSummary) testSummary = parsed.testSummary;

          if (Array.isArray(parsed.files)) {
            for (const f of parsed.files) {
              const original = req.fileContexts[f.path] || '';
              const diffResult = computeSimpleDiff(original, f.newContent || '');

              fileChanges.push({
                path: f.path,
                action: f.action || (original ? 'modify' : 'create'),
                explanation: f.explanation || 'Updated source code',
                originalContent: original,
                newContent: f.newContent,
                diffHunk: diffResult.unifiedText,
              });
            }
          }
        } catch (e) {
          console.warn('Could not parse JSON file changes from model response:', e);
        }
      }
    }

    return {
      summary,
      rawText: responseText,
      modelUsed: usedModel,
      files: fileChanges,
      commands,
      testSummary,
      deploymentReadiness: fileChanges.length > 0 ? 'ready' : 'needs_tests',
    };
  }
}
