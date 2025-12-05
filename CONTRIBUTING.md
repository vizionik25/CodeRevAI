# Contributing to CodeRevAI

Thank you for your interest in contributing to CodeRevAI! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Style Guidelines](#code-style-guidelines)
5. [Commit Message Format](#commit-message-format)
6. [Pull Request Process](#pull-request-process)
7. [Testing Requirements](#testing-requirements)
8. [Documentation](#documentation)
9. [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

### Our Standards

- **Be Respectful:** Treat all contributors with respect and kindness
- **Be Collaborative:** Work together to solve problems
- **Be Professional:** Keep discussions focused on technical topics
- **Be Inclusive:** Welcome contributors of all backgrounds and skill levels

### Unacceptable Behavior

- Harassment, discrimination, or hate speech
- Personal attacks or trolling
- Publishing private information without consent
- Any conduct that would be inappropriate in a professional setting

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:
- **Node.js 20+** installed
- **npm** or **yarn** package manager
- **PostgreSQL** database (local or cloud)
- **Redis** instance (Upstash or local)
- **Git** for version control

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/CodeRevAI.git
   cd CodeRevAI
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/CodeRevAI.git
   ```

### Set Up Development Environment

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env.local`
   - Fill in all required values (see [README.md](./README.md#environment-variables))

3. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Verify setup:**
   - Open http://localhost:3000
   - Sign in with Clerk
   - Test code review functionality

---

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with prefixes:

- `feat/` - New features (e.g., `feat/batch-review`)
- `fix/` - Bug fixes (e.g., `fix/rate-limit-headers`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/error-handling`)
- `test/` - Test additions (e.g., `test/security-utils`)
- `chore/` - Maintenance tasks (e.g., `chore/update-deps`)

**Example:**
```bash
git checkout -b feat/add-webhook-retry-logic
```

### Development Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes:**
   - Write code following style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test locally:**
   ```bash
   npm run build       # Ensure build succeeds
   npm run test        # Run all tests (when available)
   npm run lint        # Check for linting issues
   ```

4. **Database Migrations:**
   - Use descriptive names for migrations that describe the change
   - Avoid environment-specific names (e.g., "development", "production")
   - Good examples: `add_user_subscriptions`, `update_review_history_indexes`
   - Bad examples: `development`, `test_migration`, `migration_1`
   
   ```bash
   # Creating a new migration
   npx prisma migrate dev --name add_user_subscriptions
   
   # Deploying migrations to production
   npx prisma migrate deploy
   ```

4. **Commit your changes** (see [Commit Message Format](#commit-message-format))

5. **Keep your branch updated:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork:**
   ```bash
   git push origin feat/your-feature-name
   ```

7. **Open a Pull Request** (see [Pull Request Process](#pull-request-process))

---

## Code Style Guidelines

### TypeScript

#### General Rules
- **Use TypeScript:** All `.ts` and `.tsx` files must have proper typing
- **No `any`:** Avoid using `any` type (use `unknown` if necessary)
- **Strict Mode:** Enable `strict: true` in `tsconfig.json`
- **Explicit Return Types:** Add return types to all functions

**Example:**
```typescript
// ❌ BAD
function getUser(id) {
  return prisma.user.findUnique({ where: { id } });
}

// ✅ GOOD
async function getUser(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } });
}
```

#### Naming Conventions
- **Variables/Functions:** `camelCase` (e.g., `userId`, `checkRateLimit`)
- **Types/Interfaces:** `PascalCase` (e.g., `ReviewMode`, `ApiResponse`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`, `RATE_LIMIT_WINDOW`)
- **Private Properties:** Prefix with `_` (e.g., `_internalCache`)

#### Type Definitions
```typescript
// ✅ Use interfaces for object shapes
interface ReviewRequest {
  code: string;
  language: string;
  modes: string[];
}

// ✅ Use type aliases for unions/intersections
type ErrorCode = 'UNAUTHORIZED' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_INPUT';

// ✅ Export types from index files
export type { ReviewRequest, ErrorCode };
```

---

### React Components

#### Component Structure
```typescript
// ✅ Functional components with TypeScript
interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

export function CodeInput({ value, onChange, language = 'javascript' }: CodeInputProps) {
  // Hooks first
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Effects second
  useEffect(() => {
    validateInput(value);
  }, [value]);

  // Event handlers third
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Render last
  return (
    <textarea ref={inputRef} value={value} onChange={handleChange} />
  );
}
```

#### Best Practices
- **Use Functional Components:** No class components
- **Props Destructuring:** Destructure props in function signature
- **PropTypes with TypeScript:** Use TypeScript interfaces, not PropTypes
- **Avoid Inline Functions:** Define handlers outside JSX when complex
- **Key Props:** Always provide unique `key` when mapping arrays

---

### API Routes

#### Consistent Error Handling Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createErrorResponse } from '@/app/utils/errors';
import { checkRateLimitRedis } from '@/app/utils/redis';
import { logger } from '@/app/utils/logger';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const startTime = Date.now();

  try {
    // 1. Authentication
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 401);
    }

    // 2. Rate Limiting
    const rateLimit = await checkRateLimitRedis(
      `endpoint:${userId}`,
      20,
      60000,
      true // failClosed
    );
    if (!rateLimit.allowed) {
      return createErrorResponse('RATE_LIMIT_EXCEEDED', 429);
    }

    // 3. Input Validation
    const body = await request.json();
    // ... validation logic

    // 4. Business Logic
    const result = await processRequest(body);

    // 5. Success Response
    logger.info('Request completed', {
      duration: `${Date.now() - startTime}ms`,
      userId
    }, requestId);

    return NextResponse.json(result, {
      headers: {
        'X-Request-ID': requestId,
        'X-RateLimit-Remaining': rateLimit.remaining.toString()
      }
    });

  } catch (error) {
    logger.error('Request failed', error, requestId);
    return createErrorResponse('INTERNAL_ERROR', 500, error);
  }
}
```

---

### Utility Functions

#### Pure Functions
```typescript
// ✅ Pure function with clear input/output
export function sanitizeInput(input: string, maxLength = 10000): string {
  if (!input) return '';
  return input
    .replace(/\0/g, '')  // Remove null bytes
    .trim()
    .slice(0, maxLength);
}

// ✅ Include JSDoc comments
/**
 * Validates code input size against limits
 * @param code - The code string to validate
 * @param maxSize - Maximum allowed size in bytes
 * @returns Validation result with error message if invalid
 */
export function validateCodeInput(
  code: string,
  maxSize: number = 500_000
): { valid: boolean; error?: string } {
  if (!code) return { valid: false, error: 'Code is required' };
  if (code.length > maxSize) {
    return { valid: false, error: `Code exceeds ${maxSize} bytes` };
  }
  return { valid: true };
}
```

---

## Commit Message Format

We follow **Conventional Commits** specification for clear, structured commit messages.

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring (no feature change)
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (deps, config)
- `ci:` - CI/CD changes

### Examples
```bash
# Feature
feat(dashboard): add batch file review support

# Bug fix
fix(api): correct rate limit header calculation

# Documentation
docs(readme): update environment variable table

# Refactor
refactor(errors): consolidate error handling logic

# Performance
perf(gemini): implement response caching

# Breaking change
feat(api)!: change review response format

BREAKING CHANGE: Review responses now return { feedback: string } instead of plain string
```

### Rules
- **Subject:** Use imperative mood ("add" not "added")
- **Length:** Subject max 72 characters
- **Capitalization:** Don't capitalize first letter
- **Punctuation:** No period at the end
- **Body:** Explain *what* and *why*, not *how*
- **Footer:** Reference issues (`Closes #123`)

---

## Pull Request Process

### Before Submitting

**Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Commit messages follow format
- [ ] Branch is up to date with `main`

### PR Title Format

Use conventional commit format:
```
feat(scope): add new feature
fix(scope): resolve bug in component
docs: update contributing guidelines
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Motivation and Context
Why is this change needed? What problem does it solve?

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
Describe tests you ran and how to reproduce them

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass
```

### Review Process

1. **Automated Checks:** CI runs linting, tests, build
2. **Code Review:** At least one maintainer reviews
3. **Feedback:** Address all review comments
4. **Approval:** Maintainer approves changes
5. **Merge:** Maintainer merges PR

### Review Timeline

- **Initial Review:** Within 3 business days
- **Follow-up Reviews:** Within 1 business day
- **Merge:** After approval and passing checks

---

## Testing Requirements

### Unit Tests

**Required for:**
- Utility functions (`app/utils/`)
- Service layer functions (`app/services/`)
- Custom hooks
- Helper functions

**Example:**
```typescript
// app/utils/__tests__/security.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeInput, validateCodeInput } from '../security';

describe('sanitizeInput', () => {
  it('should remove null bytes', () => {
    const input = 'test\0string';
    expect(sanitizeInput(input)).toBe('teststring');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  test  ')).toBe('test');
  });

  it('should limit length', () => {
    const long = 'a'.repeat(20000);
    expect(sanitizeInput(long, 1000).length).toBe(1000);
  });
});

describe('validateCodeInput', () => {
  it('should reject empty code', () => {
    const result = validateCodeInput('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject oversized code', () => {
    const large = 'x'.repeat(600_000);
    const result = validateCodeInput(large);
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

**Required for:**
- API route handlers
- Database operations
- External service integrations

**Example:**
```typescript
// app/api/review-code/__tests__/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../route';

describe('POST /api/review-code', () => {
  beforeEach(() => {
    // Set up test environment
  });

  it('should return 401 without authentication', async () => {
    const request = createMockRequest({ code: 'test' });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should validate code input', async () => {
    const request = createAuthenticatedRequest({ code: '' });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### Coverage Requirements

- **Utility functions:** 80%+ coverage
- **API routes:** 70%+ coverage
- **Components:** 60%+ coverage (when tests added)

---

## Documentation

### Code Comments

**When to comment:**
- Complex algorithms or logic
- Non-obvious workarounds
- Security-sensitive code
- Public API functions

**JSDoc format:**
```typescript
/**
 * Checks if user has exceeded rate limit for endpoint
 * @param key - Rate limit key (e.g., 'review-code:userId')
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @param failClosed - If true, deny requests when Redis unavailable
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowMs: number,
  failClosed: boolean = false
): Promise<RateLimitResult> {
  // Implementation
}
```

### Documentation Files

**Update when:**
- Adding new features → `README.md`
- Changing architecture → `docs/ARCHITECTURE.md`
- Modifying API → `docs/API_REFERENCE.md` (if exists)
- Updating dependencies → `README.md` (Tech Stack)

---

## Issue Guidelines

### Reporting Bugs

**Template:**
```markdown
### Description
Clear description of the bug

### Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

### Expected Behavior
What you expected to happen

### Actual Behavior
What actually happened

### Environment
- OS: [e.g., macOS 13.0]
- Browser: [e.g., Chrome 120]
- Node.js: [e.g., 20.10.0]
- Version: [e.g., 2.0.0]

### Additional Context
Screenshots, logs, etc.
```

### Feature Requests

**Template:**
```markdown
### Feature Description
Clear description of the feature

### Use Case
Why is this feature needed?

### Proposed Solution
How should it work?

### Alternatives Considered
Other approaches you've thought about

### Additional Context
Mockups, examples, etc.
```

---

## Questions?

- **Documentation:** Check [README.md](./README.md) and [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Issues:** Open an issue on GitHub
- **Discussions:** Use GitHub Discussions for questions
- **Security:** Email security issues privately (see SECURITY.md)

---

Thank you for contributing to CodeRevAI! 🎉
