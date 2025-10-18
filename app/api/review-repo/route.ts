import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  sanitizeInput,
  validateCustomPrompt,
  validateReviewModes,
  validateRepoUrl,
  validateFileSize,
  filterSensitiveFiles,
  checkRateLimit,
} from '@/app/utils/security';
import { PROMPT_INSTRUCTIONS } from '@/app/data/prompts';
import { getGeminiAI } from '@/app/utils/apiClients';
import { FILE_SIZE_LIMITS } from '@/app/data/constants';

function buildRepoPrompt(files: Array<{ path: string; content: string }>, repoUrl: string, customPrompt: string, modes: string[]): string {
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

export async function POST(req: Request) {
  try {
    // Check authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting - 5 requests per minute for repo reviews (more intensive)
    const rateLimit = checkRateLimit(`review-repo:${userId}`, 5, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Repository reviews are limited to 5 per minute.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          }
        }
      );
    }

    // Parse request body
    const { files, repoUrl, customPrompt, reviewModes } = await req.json();

    // Validate inputs
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Files array is required and must not be empty' },
        { status: 400 }
      );
    }

    const urlValidation = validateRepoUrl(repoUrl);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    const promptValidation = validateCustomPrompt(customPrompt || '');
    if (!promptValidation.valid) {
      return NextResponse.json(
        { error: promptValidation.error },
        { status: 400 }
      );
    }

    const modesValidation = validateReviewModes(reviewModes || []);
    if (!modesValidation.valid) {
      return NextResponse.json(
        { error: modesValidation.error },
        { status: 400 }
      );
    }

    // Filter out sensitive files
    const safeFiles = filterSensitiveFiles(files);
    
    if (safeFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid files to review after filtering sensitive files' },
        { status: 400 }
      );
    }

    // Sanitize file contents and check total size
    let totalSize = 0;
    const sanitizedFiles = safeFiles.map(file => {
      const sanitizedContent = sanitizeInput(file.content || '');
      totalSize += sanitizedContent.length;
      return {
        path: sanitizeInput(file.path),
        content: sanitizedContent,
      };
    });

    // Check total repository size
    const sizeValidation = validateFileSize(sanitizedFiles.map(f => f.content).join(''), FILE_SIZE_LIMITS.REPO_TOTAL_MAX);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      );
    }

    const sanitizedPrompt = customPrompt ? sanitizeInput(customPrompt) : '';
    const sanitizedRepoUrl = sanitizeInput(repoUrl);

    // Build prompt
    const prompt = buildRepoPrompt(
      sanitizedFiles,
      sanitizedRepoUrl,
      sanitizedPrompt,
      reviewModes || ['comprehensive']
    );

    // Call Gemini AI
    const aiInstance = getGeminiAI();

    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const feedback = response.text || '';

    return NextResponse.json(
      { feedback },
      {
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        }
      }
    );
  } catch (error: any) {
    console.error('Error in repository review API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to review repository' },
      { status: 500 }
    );
  }
}
