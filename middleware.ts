// Middleware temporarily disabled to prevent 500 errors
// TODO: Implement authentication at component level instead

export default function middleware(req: Request) {
  // No middleware logic for now
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
