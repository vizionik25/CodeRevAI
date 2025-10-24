/**
 * Tests for Markdown Utilities
 * Tests markdown fence removal and code block processing
 */

import { describe, it, expect } from 'vitest';
import { cleanMarkdownFences } from './markdown';

describe('Markdown Utilities', () => {
  describe('cleanMarkdownFences', () => {
    describe('Basic Code Block Handling', () => {
      it('should remove markdown fences from single code block', () => {
        const input = '```javascript\nconsole.log("Hello World");\n```';
        const expected = 'console.log("Hello World");';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should remove markdown fences from multiple code blocks', () => {
        const input = `\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`typescript
const y: number = 2;
\`\`\``;
        const expected = 'const x = 1;\n\nconst y: number = 2;';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle code blocks without language specifier', () => {
        const input = '```\nconsole.log("Hello World");\n```';
        const expected = 'console.log("Hello World");';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should preserve code formatting and indentation', () => {
        const input = `\`\`\`python
def hello():
    print("Hello")
    if True:
        print("World")
\`\`\``;
        const expected = `def hello():
    print("Hello")
    if True:
        print("World")`;
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle empty code blocks', () => {
        const input = '```javascript\n\n```';
        const expected = '';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });
    });

    describe('Language-Specific Filtering', () => {
      it('should extract only matching language blocks when language is specified', () => {
        const input = `\`\`\`javascript
console.log("JS");
\`\`\`

\`\`\`python
print("Python")
\`\`\`

\`\`\`javascript
alert("More JS");
\`\`\``;
        
        const result = cleanMarkdownFences(input, 'javascript');
        expect(result).toBe('console.log("JS");\n\nalert("More JS");');
      });

      it('should handle case-insensitive language matching', () => {
        const input = `\`\`\`JavaScript
console.log("Hello");
\`\`\`

\`\`\`PYTHON
print("Python")
\`\`\``;
        
        const result = cleanMarkdownFences(input, 'JavaScript');
        expect(result).toBe('console.log("Hello");');
      });

      it('should return empty string when no matching language blocks found', () => {
        const input = `\`\`\`python
print("Python")
\`\`\``;
        
        const result = cleanMarkdownFences(input, 'javascript');
        expect(result).toBe('');
      });

      it('should handle partial language matches', () => {
        const input = `\`\`\`js
console.log("Short JS");
\`\`\`

\`\`\`javascript
console.log("Full JS");
\`\`\``;
        
        const result = cleanMarkdownFences(input, 'js');
        expect(result).toBe('console.log("Short JS");');
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle empty string input', () => {
        expect(cleanMarkdownFences('')).toBe('');
      });

      it('should handle null/undefined input gracefully', () => {
        expect(cleanMarkdownFences(null as any)).toBe('');
        expect(cleanMarkdownFences(undefined as any)).toBe('');
      });

      it('should handle code without markdown fences', () => {
        const input = 'console.log("Hello World");';
        expect(cleanMarkdownFences(input)).toBe(input);
      });

      it('should remove stray backticks when no complete fences found', () => {
        const input = 'console.log("Hello"); ```';
        const expected = 'console.log("Hello");';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle incomplete code blocks by removing backticks', () => {
        const input = '```javascript\nconsole.log("Hello");';
        const expected = 'javascript\nconsole.log("Hello");';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle malformed fences', () => {
        const input = '``javascript\nconsole.log("Hello");\n```';
        const expected = '``javascript\nconsole.log("Hello");';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle nested backticks within code', () => {
        const input = `\`\`\`javascript
const template = \`Hello \${name}\`;
console.log("Code with \`backticks\`");
\`\`\``;
        const expected = `const template = \`Hello \${name}\`;
console.log("Code with \`backticks\`");`;
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle code blocks with extra whitespace by removing backticks', () => {
        const input = '   ```javascript   \n  console.log("Hello");  \n  ```   ';
        const expected = 'javascript   \n  console.log("Hello");';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle very long code blocks', () => {
        const longCode = 'console.log("line");'.repeat(1000);
        const input = `\`\`\`javascript\n${longCode}\n\`\`\``;
        
        const result = cleanMarkdownFences(input);
        expect(result).toBe(longCode);
        expect(result.length).toBe(longCode.length);
      });
    });

    describe('Mixed Content Scenarios', () => {
      it('should handle code blocks mixed with regular text', () => {
        const input = `Here's some JavaScript code:

\`\`\`javascript
console.log("Hello");
\`\`\`

And here's some Python:

\`\`\`python
print("World")
\`\`\`

That's all!`;
        
        const expected = 'console.log("Hello");\n\nprint("World")';
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle inline code with code blocks', () => {
        const input = `Use \`console.log()\` for debugging.

\`\`\`javascript
console.log("Debug info");
\`\`\``;
        
        const expected = 'console.log("Debug info");';
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle code blocks with different line endings by removing backticks', () => {
        const input = '```javascript\r\nconsole.log("Windows");\r\n```';
        const expected = 'javascript\r\nconsole.log("Windows");';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });
    });

    describe('Real-World AI Response Patterns', () => {
      it('should clean typical AI model responses', () => {
        const input = `Here's the corrected code:

\`\`\`typescript
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  return users.find(u => u.id === id);
}
\`\`\`

This implementation fixes the type safety issues.`;
        
        const expected = `interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  return users.find(u => u.id === id);
}`;
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle multiple language blocks in AI responses', () => {
        const input = `Fix these files:

\`\`\`javascript
// client.js
const api = new ApiClient();
\`\`\`

\`\`\`typescript
// types.ts
interface ApiResponse {
  data: any;
}
\`\`\``;
        
        const expected = `// client.js
const api = new ApiClient();\n\n// types.ts
interface ApiResponse {
  data: any;
}`;
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should extract only requested language from mixed AI response', () => {
        const input = `Here are implementations in multiple languages:

\`\`\`python
def hello():
    return "Hello from Python"
\`\`\`

\`\`\`javascript
function hello() {
    return "Hello from JS";
}
\`\`\`

\`\`\`java
public String hello() {
    return "Hello from Java";
}
\`\`\``;
        
        const result = cleanMarkdownFences(input, 'javascript');
        const expected = `function hello() {
    return "Hello from JS";
}`;
        
        expect(result).toBe(expected);
      });
    });

    describe('Performance and Robustness', () => {
      it('should handle code with special regex characters', () => {
        const input = '```javascript\nconst regex = /[.*+?^${}()|[\\\\]\\\\\\\\]/g;\nconst str = "Test (parentheses) and [brackets]";\n```';
        const expected = 'const regex = /[.*+?^${}()|[\\\\]\\\\\\\\]/g;\nconst str = "Test (parentheses) and [brackets]";';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle unicode characters in code', () => {
        const input = `\`\`\`python
# 测试中文注释
name = "用户名"
emoji = "🚀"
\`\`\``;
        
        const expected = `# 测试中文注释
name = "用户名"
emoji = "🚀"`;
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });

      it('should handle code blocks with no trailing newline by removing backticks', () => {
        const input = '```javascript\nconsole.log("No newline")```';
        const expected = 'javascript\nconsole.log("No newline")';
        
        expect(cleanMarkdownFences(input)).toBe(expected);
      });
    });
  });
});