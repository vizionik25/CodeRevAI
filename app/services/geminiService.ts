// Gemini Service - Client-side wrapper for secure API calls
// All AI calls are proxied through Next.js API routes to protect the API key

/**
 * Review a single code file
 */
export async function reviewCode(code: string, language: string, customPrompt: string, modes: string[]): Promise<string> {
  try {
    const response = await fetch('/api/review-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        language,
        customPrompt,
        reviewModes: modes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to review code');
    }

    const data = await response.json();
    return data.feedback || '';
  } catch (error) {
    console.error("Error calling review API:", error);
    if (error instanceof Error) {
        throw new Error(`Error during code review: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}

/**
 * Review an entire repository
 */
export async function reviewRepository(files: { path: string, content: string }[], repoUrl: string, customPrompt: string, modes: string[]): Promise<string> {
  try {
    const response = await fetch('/api/review-repo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files,
        repoUrl,
        customPrompt,
        reviewModes: modes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to review repository');
    }

    const data = await response.json();
    return data.feedback || '';
  } catch (error) {
    console.error("Error calling repository review API:", error);
    if (error instanceof Error) {
        throw new Error(`Error during repository review: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}

/**
 * Generate refactored code based on review feedback
 */
export async function generateFullCodeFromReview(originalCode: string, language: string, feedback: string): Promise<string> {
  try {
    const response = await fetch('/api/generate-diff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalCode,
        language,
        feedback,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate modified code');
    }

    const data = await response.json();
    let newCode = data.modifiedCode || '';

    // Clean up potential markdown fences that the model might still add
    const codeBlockRegex = new RegExp("```(?:" + language.toLowerCase() + ")?\\n([\\s\\S]*?)\\n```", "g");
    const matches = [...newCode.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
        newCode = matches.map(match => match[1]).join('\n');
    } else {
        newCode = newCode.replace(/```/g, '');
    }

    return newCode.trim();
  } catch (error) {
    console.error("Error calling generate diff API:", error);
    if (error instanceof Error) {
        throw new Error(`Error generating refactored code: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}
