# CodeRevAI Project `GEMINI.md`

This document provides a comprehensive overview of the CodeRevAI project, its structure, and development practices to be used as instructional context for future interactions.

## Project Overview

CodeRevAI is a production-ready, AI-powered code review platform. It leverages Google Gemini for code analysis and is built with Next.js 15, TypeScript, and Tailwind CSS. The application is designed for enterprise use, incorporating features like authentication via Clerk, payment processing with Stripe, and robust observability and security measures. It is deployed on Google Cloud Run.

The architecture is based on a Next.js App Router structure, with a clear separation between the client-side, API routes, and service layers. It uses PostgreSQL with Prisma for database interactions and Redis for caching and rate limiting.

## Building and Running

### Prerequisites

*   Node.js (version 20+)
*   npm
*   PostgreSQL
*   Redis
*   API keys for Google Gemini, Clerk, and Stripe.

### Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/vizionik25/CodeRevAI.git
    cd CodeRevAI
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env.local` file with the necessary API keys and database URLs. A `.env.example` file is provided as a template.

4.  **Database Migration:**
    ```bash
    npx prisma generate
    npx prisma migrate dev
    ```

### Development

*   **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Building

*   **Create a production build:**
    ```bash
    npm run build
    ```

### Testing

*   **Run all tests:**
    ```bash
    npm run test
    ```

*   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```

*   **View test coverage:**
    ```bash
    npm run test:coverage
    ```

*   **Type checking:**
    ```bash
    npx tsc --noEmit
    ```

## Development Conventions

### Coding Style

*   The project uses TypeScript and follows standard Next.js and React conventions.
*   Code is formatted using Prettier (inferred from the presence of `next lint`).
*   The codebase is structured with a clear separation of concerns, as detailed in the `README.md`.

### Testing

*   The project uses `vitest` for unit and integration testing.
*   Tests are located in `__tests__` directories alongside the code they are testing.
*   The project aims for high test coverage, as indicated by the `test:coverage` script.

### Commits and Contributions

*   The `CONTRIBUTING.md` file outlines the contribution process.
*   Commit messages should follow a conventional format (e.g., `feat:`, `fix:`, `docs:`).
*   Pull requests should be made to the `main` branch and require passing all tests and linting checks.
