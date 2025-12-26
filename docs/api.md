# CodeRevAI API Documentation

CodeRevAI provides a powerful API for automated code review, refactoring, and quality analysis. This API is designed to be easily integrated with automation platforms like Make.com, Zapier, n8n, as well as custom CI/CD pipelines.

## Authentication

All API requests must be authenticated using an API Key. You can generate an API Key in your [CodeRevAI Dashboard](/dashboard).

Include the API Key in the `Authorization` header of your HTTP requests:

```http
Authorization: Bearer sk_live_...
```

## Base URL

```
https://your-coderevai-instance.com/api
```

## Endpoints

### 1. Review Code Snippet

Analyzes a single code snippet and provides feedback, refactoring suggestions, and security checks.

**Endpoint:** `POST /review-code`

**Rate Limit:** 20 requests per minute

**Request Body:**

```json
{
  "code": "function add(a,b) { return a+b; }",
  "language": "javascript",
  "customPrompt": "Focus on security", // Optional
  "reviewModes": ["security", "performance"] // Optional
}
```

**Response:**

```json
{
  "feedback": "## Review Results\n\n..."
}
```

**Example (curl):**

```bash
curl -X POST https://coderevai.com/api/review-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "code": "console.log(userInput)",
    "language": "javascript",
    "reviewModes": ["security"]
  }'
```

---

### 2. Generate Diff

Generates a refactored version of the code based on the review.

**Endpoint:** `POST /generate-diff`

**Rate Limit:** 15 requests per minute

**Request Body:**

```json
{
  "code": "const x = 1;",
  "language": "javascript",
  "customPrompt": "Convert to TypeScript"
}
```

**Response:**

```json
{
  "diff": "..." // Git-style diff string
}
```

---

### 3. Review Repository

Analyzes multiple files from a repository.

**Endpoint:** `POST /review-repo`

**Rate Limit:** 5 requests per minute

**Request Body:**

```json
{
  "repoUrl": "https://github.com/owner/repo",
  "files": [
    {
      "path": "src/index.ts",
      "content": "..."
    }
  ],
  "customPrompt": "Check for architectural issues",
  "reviewModes": ["comprehensive"]
}
```

**Response:**

```json
{
  "feedback": "# Repository Review\n\n..."
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Request succeeded.
- `400 Bad Request`: Invalid input (missing fields, invalid JSON).
- `401 Unauthorized`: Missing or invalid API Key.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Server error or AI service failure.

**Error Response Body:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later."
  }
}
```

## CORS Support

Cross-Origin Resource Sharing (CORS) is enabled for all API endpoints, allowing you to call the API directly from browser-based applications or tools.
