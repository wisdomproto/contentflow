import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // 정적 파일(.html 등 public 자산)은 auth 미들웨어 제외 — strategy-templates iframe 등
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:html|svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
