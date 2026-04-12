import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const redirectUri = `${req.nextUrl.origin}/api/auth/meta/callback`

  // Required scopes for Instagram, Facebook Pages, and Threads
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_business_basic',
    'instagram_business_content_publish',
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_show_list',
    'threads_basic',
    'threads_content_publish',
    'business_management',
    'public_profile',
  ].join(',')

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`

  return NextResponse.redirect(authUrl)
}
