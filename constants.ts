import { ReviewMode, ReviewModeGroup, Language } from './types';

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
  { value: 'nodejs', label: 'Node.js' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'php', label: 'PHP' },
];

export const REVIEW_MODE_GROUPS: ReviewModeGroup[] = [
  {
    name: "Core Analysis",
    modes: [
        { value: 'comprehensive', label: 'Comprehensive', description: 'A full review covering bugs, performance, security, and style.' },
        { value: 'bug_fixes', label: 'Bug Fixes', description: 'Focus only on finding bugs and logic errors.' },
        { value: 'performance', label: 'Performance', description: 'Focus only on performance optimizations.' },
        { value: 'security', label: 'Security Audit', description: 'Focus only on security vulnerabilities.' },
        { value: 'style', label: 'Code Style', description: 'Focus only on readability, style, and best practices.' },
    ]
  },
  {
    name: "Code Generation",
    modes: [
      { value: 'test_generation', label: 'Test Generation', description: 'Generate unit tests and test scenarios for the code.' },
    ]
  },
  {
    name: "Final Checks",
    modes: [
      { value: 'production_ready', label: 'Production Ready', description: 'A final, rigorous check for reliability, security, and best practices before deployment.' },
    ]
  }
];