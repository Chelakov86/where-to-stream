# Project Overview

This is a Next.js application called "WhereToStream" that allows users to find where movies and TV shows are streaming. It uses the TMDB (The Movie Database) API to fetch data.

**Key Technologies:**

*   **Framework:** Next.js (with App Router)
*   **Language:** TypeScript
*   **Styling:** TailwindCSS
*   **Testing:** Jest and React Testing Library

**Architecture:**

The application is structured as a standard Next.js project.

*   The `app/` directory contains the main application code, including pages, layouts, and components.
*   The `app/tmdbApi.ts` and `app/tmdbClient.ts` files handle interactions with the TMDB API.
*   Configuration is managed in `app/config.ts`, which includes retrieving the TMDB API key from environment variables.
*   Tests are located in the `__tests__/` directory.

# Building and Running

**1. Install Dependencies:**

```bash
npm install
```

**2. Set up Environment Variables:**

Create a `.env.local` file in the root of the project and add your TMDB API key:

```
TMDB_API_KEY=your_api_key_here
```

**3. Run the Development Server:**

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

**4. Run Tests:**

```bash
npm test
```

**5. Build for Production:**

```bash
npm run build
npm start
```

# Development Conventions

*   **Coding Style:** The project uses Prettier for code formatting. You can format the code by running:
    ```bash
    npm run format
    ```
*   **Linting:** The project uses ESLint to identify and fix problems in the code. You can run the linter with:
    ```bash
    npm run lint
    ```
*   **Testing:** The project uses Jest and React Testing Library for testing. Tests are located in the `__tests__` directory and follow the `*.test.ts` or `*.test.tsx` naming convention.
