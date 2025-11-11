# WhereToStream

A Next.js application to find where movies and TV shows are streaming.

## Project Setup

This project has been initialized with:
- **Next.js 16** (App Router)
- **React 18** & **TypeScript 5.9**
- **TailwindCSS 3** with dark theme configuration
- **Jest 30** & **React Testing Library 16** for testing

## Getting Started

### Install Dependencies

```bash
npm install --production=false
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Run Tests

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Project Structure

```
where-to-stream/
├── app/
│   ├── globals.css      # Global styles with TailwindCSS
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Home page component
├── __tests__/
│   └── page.test.tsx    # Tests for the home page
├── jest.config.js       # Jest configuration
├── jest.setup.ts        # Jest setup file
├── next.config.js       # Next.js configuration
├── tailwind.config.ts   # TailwindCSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies and scripts
```

## Dark Theme Configuration

The project uses a custom dark theme configured in `tailwind.config.ts`:

- **Background**: Near-black (`#0a0a0f`)
- **Text**: Light gray (`#e0e0e0`)
- **Primary Accent**: Cyan/neon blue (`#00d4ff`)
- **Secondary Accent**: Warm orange (`#ff6b35`)

## Testing

Tests are configured using:
- **Jest** with jsdom environment
- **React Testing Library** for component testing
- **@testing-library/jest-dom** for additional matchers

Example test file is located at `__tests__/page.test.tsx`.

## Next Steps

This is the initial setup. Follow the TDD prompts in `blueprint.md` to implement:
1. Configuration module with TMDB API integration
2. Backend API routes
3. Frontend components (search, results, details)
4. Complete streaming availability features

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.9
- **Styling**: TailwindCSS 3
- **Testing**: Jest 30 + React Testing Library 16
- **Package Manager**: npm
