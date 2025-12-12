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

export const AUTO_DETECT_LANGUAGE_KEY = 'auto-detect';

export const LANGUAGE_OVERRIDE_OPTIONS = [
  { value: AUTO_DETECT_LANGUAGE_KEY, label: 'Auto-Detect' },
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
  /** Maximum size for individual local files (212MB) */
  LOCAL_FILE_MAX: 222240800,

  /** Maximum total content size for repository reviews (50MB) 
   * Repositories contain multiple files, so aggregate size can be substantial
   * Set to match Gemini's context window capacity
   */
  REPO_TOTAL_MAX: 50 * 1024 * 1024,

  /** Maximum size for single code input via paste/editor (212MB) */
  SINGLE_CODE_INPUT_MAX: 222240800,

  /** Warning threshold for large files (500KB) 
   * Show warning to user but allow review to proceed
   */
  WARNING_THRESHOLD: 500 * 1024,
} as const;

/**
 * Input validation and security limits
 * Centralized limits for all text inputs and prompts
 */
export const INPUT_LIMITS = {
  /** Global sanity limit for any text input (prompts, metadata, etc.) - 50KB */
  GLOBAL_INPUT_SANITY_LIMIT: 50000,

  /** Maximum code length for validation (same as SINGLE_CODE_INPUT_MAX) */
  MAX_CODE_LENGTH: 222240800,

  /** Maximum custom prompt length - 5KB */
  CUSTOM_PROMPT_MAX: 5120,

  /** Maximum feedback length for diff generation - 50KB */
  FEEDBACK_MAX: 50000,

  /** Default file validation limit - 200KB */
  FILE_VALIDATION_DEFAULT: 200000,
} as const;

/**
 * Stripe subscription plan configuration
 * Valid plan names for subscription management
 */
export const ALLOWED_PLANS = ['pro', 'enterprise'] as const;
export type AllowedPlan = typeof ALLOWED_PLANS[number];

/**
 * Mapping of Stripe Price IDs to internal plan names
 * Update this when adding new price tiers or changing Stripe configuration
 */
export const PRICE_ID_TO_PLAN: Record<string, string> = {
  // Note: These should match your actual Stripe Price IDs from environment variables
  // Example: [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO]: 'pro'
  // For now, this will be populated at runtime in the webhook handler
};