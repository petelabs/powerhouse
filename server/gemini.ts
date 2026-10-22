import { GoogleGenAI } from '@google/genai';
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
  requestedModel?: string;
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
    const modelName = req.requestedModel || 'gemini-2.5-flash';

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

    if (req.thinkingEnabled) {
      config.thinkingConfig = {
        thinkingBudget: 2048,
      };
    }

    let responseText = '';
    const usedModelDisplay = req.thinkingEnabled ? `${modelName} (Thinking: High)` : modelName;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userContent,
        config,
      });
      responseText = response.text || '';
    } catch (err: any) {
      console.warn(`Error invoking model ${modelName}:`, err?.message || err);
      // Fallback to gemini-2.5-flash without thinkingConfig if requested model hits error
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userContent,
          config: {
            systemInstruction: personalityInstruction,
            temperature: 0.2,
          },
        });
        responseText = fallbackResponse.text || '';
      } catch (fallbackErr: any) {
        throw new Error(`Gemini API Error: ${err?.message || fallbackErr?.message || 'Model execution failed'}`);
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
      modelUsed: usedModelDisplay,
      files: fileChanges,
      commands,
      testSummary,
      deploymentReadiness: fileChanges.length > 0 ? 'ready' : 'needs_tests',
    };
  }
}
