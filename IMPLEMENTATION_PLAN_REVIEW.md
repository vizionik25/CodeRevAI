# Implementation Plan for CodeRevAI Improvements

Based on the review in `repository-review.review (4).md`, the following changes will be implemented to improve architecture, performance, and maintainability.

## 1. Refactoring & Cleanup

### 1.1 Extract `handleApiError`
- **Goal**: Remove code duplication between `clientGeminiService.ts` and `clientHistoryService.ts`.
- **Action**: Create `app/utils/apiErrorHandling.ts` containing the shared logic.
- **Files**:
    - Create `app/utils/apiErrorHandling.ts`
    - Modify `app/services/clientGeminiService.ts`
    - Modify `app/services/clientHistoryService.ts`

### 1.2 Cleanup `next.config.js`
- **Goal**: Remove unnecessary `env` block as Next.js handles `NEXT_PUBLIC_` variables automatically.
- **Files**: `next.config.js`

### 1.3 Update `vitest.config.ts`
- **Goal**: Exclude `app/lib/prisma.ts` from test coverage.
- **Files**: `vitest.config.ts`

### 1.4 Improve `ErrorMessage.tsx` Readability
- **Goal**: Use direct emojis instead of Unicode escape sequences for better readability.
- **Files**: `app/components/ErrorMessage.tsx`

## 2. Performance Improvements

### 2.1 Optimistic History Updates
- **Goal**: Improve UI responsiveness by updating history state locally instead of re-fetching from the server after every add/clear.
- **Files**: `app/dashboard/page.tsx`

### 2.2 Code Splitting for FeedbackDisplay
- **Goal**: Reduce initial bundle size by lazy loading heavy components (`ReactDiffViewer`, `SyntaxHighlighter`).
- **Files**: `app/components/FeedbackDisplay.tsx`

## 3. Minor Fixes

### 3.1 Check Unicode in `BackgroundCodeScene.tsx`
- **Goal**: Verify the cursor character.
- **Files**: `app/components/BackgroundCodeScene.tsx`

## Execution Order

1.  Refactor `handleApiError` (1.1)
2.  Cleanup `next.config.js` (1.2)
3.  Update `vitest.config.ts` (1.3)
4.  Update `ErrorMessage.tsx` (1.4)
5.  Implement Optimistic History Updates (2.1)
6.  Implement Code Splitting (2.2)
7.  Check `BackgroundCodeScene.tsx` (3.1)
