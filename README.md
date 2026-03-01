# HireShield

AI-powered hiring evaluation platform built with Next.js, Clerk, and Prisma.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account (for authentication)

### Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables**
   Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/mydb"
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
   ```

3. **Database setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database (creates tables)
   npx prisma db push
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser.

## Architecture

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Authentication**: Clerk (signup/login, session management)
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel

## Key Features

- ✅ User authentication with Clerk
- ✅ Automatic organization provisioning on first login
- ✅ Protected routes and API endpoints
- ✅ Multi-tenant data isolation
- ✅ Server-side auth utilities

## Database Schema

The application uses the following core models:
- `User` - Clerk-linked user accounts
- `Org` - Multi-tenant organizations
- `OrgMember` - User-organization relationships with roles
- `Job`, `Candidate`, `Interview`, `Evaluation` - Core business entities

## API Routes

- `GET /api/me` - Returns current user info and organization ID
- All API routes require authentication and organization context

## Deployment

The app is configured for Vercel deployment with automatic environment variable handling.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
