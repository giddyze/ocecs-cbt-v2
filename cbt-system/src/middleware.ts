import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Protects /admin/* and /teacher/* using Supabase Auth's session cookie.
// Student routes (/student/*) are protected inside their own layout via
// getAuthenticatedStudent, since that check also needs a Supabase query
// (student_sessions) that's simpler to run in a Server Component than here.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;
  const needsStaffAuth = path.startsWith("/admin") || path.startsWith("/teacher");

  if (needsStaffAuth && !session) {
    const loginUrl = new URL("/staff/login", req.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*"]
};
