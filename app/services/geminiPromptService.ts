import { PROMPT_INSTRUCTIONS } from '@/app/data/prompts';

/**
 * Builds the AI prompt for reviewing a single code file.
 */
export function buildPrompt(code: string, language: string, customPrompt: string, modes: string[]): string {
    const activeModes = modes.length > 0 ? modes : ['comprehensive'];
    const modeLabels = activeModes.map(m => m.replace(/_/g, ' ')).join(', ');

    const instructions = activeModes.map(mode => {
        const instruction = PROMPT_INSTRUCTIONS[mode] || '';
        return `--- INSTRUCTIONS FOR ${mode.replace(/_/g, ' ').toUpperCase()} ---\n${instruction.replace(/{language}/g, language)}`;
    }).join('\n\n');

    let prompt = `As an expert code reviewer specializing in ${modeLabels}, review the following ${language} code.

Your primary instructions are below. You must follow all sets of instructions provided.
${instructions}

---
**Code to Review:**
\`\`\`${language}
${code}
\`\`\`
---
`;

    if (customPrompt && customPrompt.trim()) {
        prompt += `
\nIn addition to the primary analysis, please follow these specific custom instructions:
---
${customPrompt.trim()}
---
`;
    }

    return prompt;
}

/**
 * Builds the AI prompt for reviewing an entire repository.
 */
export function buildRepoPrompt(files: Array<{ path: string; content: string }>, repoUrl: string, customPrompt: string, modes: string[]): string {
    const fileManifest = files.map(f => `- ${f.path}`).join('\n');

    const allCode = files.map(f => `
// FILE: ${f.path}
\`\`\`
${f.content}
\`\`\`
`).join('\n---\n');

    const activeModes = modes.length > 0 ? modes : ['comprehensive'];
    const modeLabels = activeModes.map(m => m.replace(/_/g, ' ')).join(', ');

    const instructions = activeModes.map(mode => {
        const instruction = PROMPT_INSTRUCTIONS[mode] || '';
        return `--- INSTRUCTIONS FOR ${mode.replace(/_/g, ' ').toUpperCase()} ---\n${instruction}`;
    }).join('\n\n');

    let prompt = `As an expert code reviewer specializing in ${modeLabels}, perform a holistic review of the entire codebase from ${repoUrl}.

Your review should be at the repository level. Focus on high-level feedback, architectural patterns, cross-file issues, and overall code quality. When referring to specific code, mention the file path.

Here is a manifest of all the files:
${fileManifest}

And here is the content of all the files:
---
${allCode}
---

Your primary instructions are below. You must follow all sets of instructions provided.
${instructions}

IMPORTANT: For every suggested change, please include a code snippet showing how to properly implement the change. Include a comment at the top of each snippet stating the path/to/file.ts & starting Line# - ending Line#. This will make the implementation process more efficient and less of a headache for the developer implementing the changes.
`;

    if (customPrompt && customPrompt.trim()) {
        prompt += `
\nIn addition to the primary analysis, please follow these specific custom instructions:
---
${customPrompt.trim()}
---
`;
    }

    return prompt;
}
