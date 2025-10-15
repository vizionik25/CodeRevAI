import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT_INSTRUCTIONS: Record<string, string> = {
  comprehensive: `
    Provide a comprehensive review covering the following aspects:
    1.  **Bugs and Errors**: Identify any potential bugs, logic errors, or edge cases that might have been missed.
    2.  **Performance**: Suggest optimizations for performance bottlenecks, inefficient algorithms, or excessive resource usage.
    3.  **Security**: Point out any security vulnerabilities such as injection flaws, insecure handling of credentials, or other common weaknesses.
    4.  **Best Practices & Readability**: Comment on code style, naming conventions, and overall readability. Suggest improvements based on established {language} best practices.
    5.  **Maintainability**: Assess the code's structure for long-term maintainability and suggest refactoring where necessary.

    Format your feedback clearly using Markdown. Use code blocks for suggestions. Be constructive and provide actionable advice.
  `,
  bug_fixes: `
    Focus exclusively on identifying potential bugs, logic errors, and edge cases that might have been missed.
    Provide clear explanations for each bug and suggest a corrected code snippet.
    Do not comment on code style, performance, or other aspects unless they are directly causing a bug.
    Format your feedback clearly using Markdown.
  `,
  performance: `
    Focus exclusively on performance optimization.
    Identify any performance bottlenecks, inefficient algorithms, or excessive resource usage (CPU, memory).
    For each issue, explain why it's a performance concern and provide a more performant code alternative.
    Suggest improvements based on established {language} best practices for high-performance code.
    Format your feedback clearly using Markdown.
  `,
  security: `
    Conduct a security audit of the code.
    Focus exclusively on identifying security vulnerabilities. This includes, but is not limited to, injection flaws, cross-site scripting (XSS), insecure direct object references, security misconfigurations, and sensitive data exposure.
    Reference common weakness enumerations (CWEs) where applicable.
    Provide a clear description of the vulnerability, its potential impact, and a secure code snippet to mitigate it.
    Format your feedback clearly using Markdown.
  `,
  style: `
    Focus exclusively on code style, formatting, and readability.
    Check for adherence to common {language} style guides (e.g., PEP 8 for Python, Google's style guide for TypeScript).
    Comment on naming conventions, code structure, comments, and overall clarity.
    Suggest improvements to make the code more readable and maintainable according to best practices. Do not alter the code's logic.
    Format your feedback clearly using Markdown.
  `,
  test_generation: `
    As a software quality assurance engineer, your task is to generate unit tests for the provided {language} code.
    Analyze the code to understand its functionality, inputs, and outputs.
    Identify key logic paths, edge cases, and potential failure points.
    Write a suite of tests that cover the core functionality. Use a common testing framework for the given language (e.g., Jest or Vitest for TypeScript/JavaScript, PyTest for Python, JUnit for Java).
    Your response should be the test code itself, formatted correctly within a single Markdown code block.
    Include brief comments in the test code to explain what each test case is verifying.
    Do not provide any other explanatory text outside of the code block.
  `,
  production_ready: `
    Conduct a final, rigorous pre-deployment review to ensure this code is production-ready.
    Focus on the following critical areas:
    1.  **Reliability & Robustness**: Identify potential failure points, unhandled exceptions, and race conditions. Ensure graceful error handling and fault tolerance.
    2.  **Security Hardening**: Perform a strict security audit. Look for any remaining vulnerabilities, insecure configurations, or exposure of sensitive data. Check for hardcoded secrets or API keys.
    3.  **Performance Polish**: Confirm that there are no significant performance bottlenecks that could impact scalability under load.
    4.  **Logging & Monitoring**: Verify that there is adequate logging for debugging and monitoring production issues. Suggest additions where lacking.
    5.  **Configuration Management**: Check for hardcoded values that should be externalized into configuration files or environment variables.
    6.  **Code Sanity Check**: Confirm that the code follows strict {language} best practices and is clean, maintainable, and ready for a production environment.

    Provide a concise summary of your findings. For each issue, classify its severity as a 'Blocker', 'Warning', or 'Suggestion' for deployment. Use Markdown and provide code snippets for critical changes.
  `
};

export async function reviewCode(code: string, language: string, customPrompt: string, modes: string[]): Promise<string> {
  const activeModes = modes.length > 0 ? modes : ['comprehensive'];

  const modeLabels = activeModes.map(m => m.replace(/_/g, ' ')).join(', ');
  
  const instructions = activeModes.map(mode => {
      const instruction = PROMPT_INSTRUCTIONS[mode] || '';
      return `--- INSTRUCTIONS FOR ${mode.replace(/_/g, ' ').toUpperCase()} ---\n${instruction.replace(/{language}/g, language)}`;
  }).join('\n\n');
  
  let prompt = `As an expert code reviewer specializing in ${modeLabels}, please analyze the following ${language} code.
  
You must follow all sets of instructions provided below.
`;

  if (customPrompt && customPrompt.trim()) {
      prompt += `
      
      In addition to the primary analysis, please follow these specific custom instructions:
      ---
      ${customPrompt.trim()}
      ---
      `;
  }

  prompt += `
    ${instructions}

    Code to review:
    \`\`\`${language.toLowerCase()}
    ${code}
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Error during code review: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}

export async function reviewRepository(files: { path: string, content: string }[], repoUrl: string, customPrompt: string, modes: string[]): Promise<string> {
  const fileManifest = files.map(f => `- ${f.path}`).join('\n');
  
  const allCode = files.map(f => `
// FILE: ${f.path}
\`\`\`
${f.content}
\`\`\`
`).join('\n---\n');

  if (allCode.length > 200000) { // Safety limit for context window
      throw new Error("The selected repository is too large for a holistic review. Please select a smaller repository or review individual files.");
  }
  
  const activeModes = modes.length > 0 ? modes : ['comprehensive'];
  const modeLabels = activeModes.map(m => m.replace(/_/g, ' ')).join(', ');

  const instructions = activeModes.map(mode => {
      const instruction = PROMPT_INSTRUCTIONS[mode] || '';
      return `--- INSTRUCTIONS FOR ${mode.replace(/_/g, ' ').toUpperCase()} ---\n${instruction.replace(/{language}/g, "multiple languages")}`;
  }).join('\n\n');

  let prompt = `As an expert code reviewer specializing in ${modeLabels}, please perform a holistic review of the entire codebase from the repository at ${repoUrl}.

Your review should be at the repository level. Instead of line-by-line comments for a single file, focus on high-level feedback, architectural patterns, cross-file issues, and overall code quality. When you refer to specific code, please mention the file path.

Here is a manifest of all the files provided:
${fileManifest}

And here is the content of all the files:
---
${allCode}
---

Your primary instructions are below. You must follow all sets of instructions provided.
${instructions}
`;
  
  if (customPrompt && customPrompt.trim()) {
      prompt += `
      \nIn addition to the primary analysis, please follow these specific custom instructions:
      ---
      ${customPrompt.trim()}
      ---
      `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error("Error calling Gemini API for repository review:", error);
    if (error instanceof Error) {
        throw new Error(`Error during repository review: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}

export async function generateFullCodeFromReview(originalCode: string, language: string, feedback: string): Promise<string> {
    const prompt = `
        You are an expert code refactoring assistant. Your task is to apply a list of suggestions from a code review to an original piece of code and produce the complete, final version of the code.

        **Instructions:**
        1.  Carefully read the original ${language} code.
        2.  Carefully read the code review feedback provided in Markdown.
        3.  Apply ALL the suggestions from the feedback to the original code.
        4.  Return ONLY the complete, final, and refactored code.
        5.  Do NOT include any explanations, comments, or Markdown formatting (like \`\`\`) in your output. Your response must be only the raw code itself.

        ---
        **Original Code:**
        \`\`\`${language}
        ${originalCode}
        \`\`\`
        ---
        **Code Review Feedback:**
        ${feedback}
        ---

        Return the complete, refactored code now.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // Clean up potential markdown fences that the model might still add
        let newCode = response.text || '';
        const codeBlockRegex = new RegExp("```(?:" + language.toLowerCase() + ")?\\n([\\s\\S]*?)\\n```", "g");
        const matches = [...newCode.matchAll(codeBlockRegex)];
        
        if (matches.length > 0) {
            newCode = matches.map(match => match[1]).join('\n');
        } else {
            newCode = newCode.replace(/```/g, '');
        }

        return newCode.trim();

    } catch (error) {
        console.error("Error calling Gemini API for diff generation:", error);
        if (error instanceof Error) {
            throw new Error(`Error generating refactored code: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI.");
    }
}
