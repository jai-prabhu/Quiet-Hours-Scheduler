import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const p = request.nextUrl.pathname

  // skip preflight and API (or just specific routes)
  if (request.method === 'OPTIONS') return NextResponse.next()
  if (p.startsWith('/api')) return NextResponse.next()
  // or: if (p.startsWith('/api/notify') || p.startsWith('/api/quiet')) return NextResponse.next()

  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}