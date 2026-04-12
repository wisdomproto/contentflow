import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const redirectUri = `${req.nextUrl.origin}/api/auth/meta/callback`

  // Required scopes for Instagram, Facebook Pages, and Threads
  const scopes = [
    'public_profile',
    'pages_show_list',
    'pages_manage_posts',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
  ].join(',')

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&auth_type=rerequest`

  return NextResponse.redirect(authUrl)
}
