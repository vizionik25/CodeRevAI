/**
 * AI Prompt Instructions for different review modes
 * Centralized location for all code review prompt templates
 */

export const PROMPT_INSTRUCTIONS: Record<string, string> = {
  comprehensive: `
    Provide a comprehensive review covering the following aspects:
    1.  **Bugs and Errors**: Identify any potential bugs, logic errors, or edge cases that might have been missed.
    2.  **Performance**: Suggest optimizations for performance bottlenecks, inefficient algorithms, or excessive resource usage.
    3.  **Security**: Point out any security vulnerabilities such as injection flaws, insecure handling of credentials, or other common weaknesses.
    4.  **Best Practices & Readability**: Comment on code style, naming conventions, and overall readability. Suggest improvements based on established {language} best practices.
    5.  **Maintainability**: Assess the code's structure for long-term maintainability and suggest refactoring where necessary.

    **Formatting Requirements:**
    - Use clear Markdown headings (##, ###) to organize feedback
    - Wrap ALL code suggestions in triple backticks with language identifier: \`\`\`{language}
    - Provide before/after comparisons when suggesting changes
    - Use bullet points for lists of issues
    - Be constructive and provide actionable advice with specific line numbers when possible
  `,
  bug_fixes: `
    Focus exclusively on identifying potential bugs, logic errors, and edge cases that might have been missed.
    
    For each bug found:
    1. Describe the bug and its potential impact
    2. Show the problematic code in a code block: \`\`\`{language}
    3. Explain why it's a bug
    4. Provide the corrected code in a separate code block: \`\`\`{language}
    
    Do not comment on code style, performance, or other aspects unless they are directly causing a bug.
    Format your feedback clearly using Markdown with proper code blocks.
  `,
  performance: `
    Focus exclusively on performance optimization.
    Identify any performance bottlenecks, inefficient algorithms, or excessive resource usage (CPU, memory).
    
    For each performance issue:
    1. Describe the performance problem and its impact
    2. Show the inefficient code: \`\`\`{language}
    3. Explain why it's inefficient (e.g., O(n\u00B2) complexity, unnecessary allocations)
    4. Provide optimized alternative: \`\`\`{language}
    5. Explain the performance improvement (e.g., "Reduces complexity from O(n\u00B2) to O(n)")
    
    Include benchmarks or complexity analysis when relevant.
    Format your feedback clearly using Markdown with proper code blocks.
  `,
  security: `
    Focus exclusively on security vulnerabilities and potential exploits.
    Look for: injection flaws (SQL, XSS, etc.), insecure handling of credentials, authentication issues, authorization bypasses, insecure deserialization, and other common security weaknesses.
    
    For each security issue:
    1. Describe the vulnerability and its severity (Critical/High/Medium/Low)
    2. Show the vulnerable code: \`\`\`{language}
    3. Explain the potential exploit scenario
    4. Provide secure alternative: \`\`\`{language}
    5. Add additional security recommendations if applicable
    
    Format your feedback clearly using Markdown with proper code blocks.
  `,
  best_practices: `
    Focus exclusively on code style, best practices, and readability.
    Comment on: naming conventions, code structure, design patterns, idiomatic {language} usage, comments, documentation, and overall code clarity.
    
    For each suggestion:
    1. Describe the best practice being violated
    2. Show current code: \`\`\`{language}
    3. Explain why the current approach is suboptimal
    4. Provide improved version: \`\`\`{language}
    5. Reference relevant style guides or community standards
    
    Suggest improvements based on established {language} best practices and community standards.
    Format your feedback clearly using Markdown with proper code blocks.
  `,
  test_generation: `
    Generate comprehensive unit tests for the provided code.
    Cover: edge cases, error handling, happy paths, and boundary conditions.
    Use the most appropriate testing framework for {language} (e.g., Jest/Vitest for JavaScript/TypeScript, pytest for Python, JUnit for Java, etc.).
    
    **Test Structure:**
    1. Start with imports and setup code
    2. Group related tests using describe/context blocks
    3. Each test should be clear and focused on one scenario
    4. Include assertions that validate expected behavior
    5. Add comments explaining complex test scenarios
    
    **Formatting:**
    - Wrap all test code in triple backticks with language identifier: \`\`\`{language}
    - Use descriptive test names that explain what is being tested
    - Include setup, execution, and assertion phases clearly
    - Add comments for non-obvious test logic
    
    Format your tests clearly using Markdown and code blocks.
  `,
};
