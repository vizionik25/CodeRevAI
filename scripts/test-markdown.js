// Simple test of the markdown function
const code = `\`\`\`javascript
console.log("test");
\`\`\``;

// Simulate the cleanMarkdownFences function
function cleanMarkdownFences(code, language) {
  if (!code) return '';

  // Build regex to match code blocks with optional language specifier
  const languagePattern = language ? `(?:${language.toLowerCase()})?` : '[a-z]*';
  const codeBlockRegex = new RegExp(`\\\`\\\`\\\`${languagePattern}\\\\n([\\\\s\\\\S]*?)\\\\n\\\`\\\`\\\``, 'g');
  
  console.log('Regex pattern:', codeBlockRegex);
  
  // Extract content from within fences
  const matches = [...code.matchAll(codeBlockRegex)];
  
  console.log('Matches found:', matches.length);
  console.log('Match details:', matches);
  
  if (matches.length > 0) {
    // If we found fence blocks, extract the content from within them
    return matches.map(match => match[1]).join('\n').trim();
  } else {
    // If no complete fence blocks found, just remove any stray backticks
    return code.replace(/\`\`\`/g, '').trim();
  }
}

console.log('Input:', JSON.stringify(code));
console.log('Output:', JSON.stringify(cleanMarkdownFences(code)));
console.log('Output with js filter:', JSON.stringify(cleanMarkdownFences(code, 'javascript')));
