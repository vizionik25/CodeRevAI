/**
 * Markdown utility functions for cleaning and formatting code responses from AI models
 */

/**
 * Remove markdown code fences from AI-generated code
 * AI models often wrap code in ```language ... ``` blocks, which need to be stripped
 * 
 * @param code - The code string that may contain markdown fences
 * @param language - Optional language identifier to match specific code blocks
 * @returns Cleaned code without markdown fences
 */
export function cleanMarkdownFences(code: string, language?: string): string {
  if (!code) return '';

  // Build regex to match code blocks with optional language specifier
  const languagePattern = language ? language.toLowerCase() : '[a-z]*';
  const codeBlockRegex = new RegExp(`\`\`\`${languagePattern}\\n([\\s\\S]*?)\\n\`\`\``, 'gi'); // Added 'i' flag for case insensitive
  
  // Extract content from within fences
  const matches = [...code.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    // If we found fence blocks, extract the content from within them
    return matches.map(match => match[1]).join('\n\n').trim();
  } else {
    // If language was specified but no matches found, return empty string
    if (language) {
      return '';
    }
    // If no complete fence blocks found, just remove any stray backticks
    return code.replace(/```/g, '').trim();
  }
}
