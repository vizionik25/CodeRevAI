import { ReviewMode, ReviewModeGroup, Language } from '@/app/types';

export const LANGUAGES: Language[] = [
  { value: 'typescript', label: 'TypeScript', extensions: ['.ts', '.tsx'] },
  { value: 'javascript', label: 'JavaScript', extensions: ['.js', '.jsx'] },
  { value: 'python', label: 'Python', extensions: ['.py'] },
  { value: 'java', label: 'Java', extensions: ['.java'] },
  { value: 'go', label: 'Go', extensions: ['.go'] },
  { value: 'csharp', label: 'C#', extensions: ['.cs'] },
  { value: 'rust', label: 'Rust', extensions: ['.rs'] },
  { value: 'sql', label: 'SQL', extensions: ['.sql'] },
  { value: 'php', label: 'PHP', extensions: ['.php'] },
];

export const LANGUAGE_OVERRIDE_OPTIONS = [
  { value: 'auto-detect', label: 'Auto-Detect' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'php', label: 'PHP' },
];

export const REVIEW_MODE_GROUPS: ReviewModeGroup[] = [
  {
    name: "Core Analysis",
    description: "Fundamental code review focuses - choose the areas most important to you",
    modes: [
        { 
          value: 'comprehensive', 
          label: 'Comprehensive Review', 
          description: 'Full analysis covering bugs, performance, security, best practices, and maintainability. Best for initial reviews or when you want complete feedback.' 
        },
        { 
          value: 'security', 
          label: 'Security Audit', 
          description: 'Deep security analysis: injection flaws, authentication issues, credential handling, and OWASP vulnerabilities. Critical for production code.' 
        },
        { 
          value: 'bug_fixes', 
          label: 'Bug Detection', 
          description: 'Identify logic errors, edge cases, null pointer issues, and runtime bugs. Focuses only on correctness, not style.' 
        },
        { 
          value: 'performance', 
          label: 'Performance Optimization', 
          description: 'Find bottlenecks, inefficient algorithms, memory leaks, and O(n\u00B2) complexity. Includes specific optimization suggestions.' 
        },
        { 
          value: 'best_practices', 
          label: 'Best Practices & Style', 
          description: 'Code readability, naming conventions, design patterns, and language-specific idioms. Improves maintainability and team collaboration.' 
        },
    ]
  },
  {
    name: "Code Generation",
    description: "AI-powered code generation and test creation",
    modes: [
      { 
        value: 'test_generation', 
        label: 'Test Generation', 
        description: 'Generate comprehensive unit tests with edge cases, mocks, and assertions. Uses appropriate testing frameworks for your language.' 
      },
    ]
  },
  {
    name: "Production Readiness",
    description: "Final verification before deployment",
    modes: [
      { 
        value: 'production_ready', 
        label: 'Production Ready Check', 
        description: 'Comprehensive pre-deployment audit: security hardening, error handling, logging, scalability, and deployment best practices.' 
      },
    ]
  }
];

/**
 * File size limits for different code review contexts
 * These limits balance AI processing capacity with user experience
 */
export const FILE_SIZE_LIMITS = {
  /** Maximum size for individual local files (1MB) */
  LOCAL_FILE_MAX: 1024 * 1024,
  
  /** Maximum total content size for repository reviews (200KB) 
   * Repositories contain multiple files, so aggregate size must be smaller
   */
  REPO_TOTAL_MAX: 200 * 1024,
  
  /** Maximum size for single code input via paste/editor (500KB) */
  SINGLE_CODE_INPUT_MAX: 500 * 1024,
  
  /** Warning threshold for large files (100KB) 
   * Show warning to user but allow review to proceed
   */
  WARNING_THRESHOLD: 100 * 1024,
} as const;