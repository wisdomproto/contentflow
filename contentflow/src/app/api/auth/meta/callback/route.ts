import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings?meta_error=' + (error || 'no_code'), req.url))
  }

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = `${req.nextUrl.origin}/api/auth/meta/callback`

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    )
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return NextResponse.redirect(new URL('/settings?meta_error=' + tokenData.error.message, req.url))
    }

    // Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longTokenData = await longTokenRes.json()
    const accessToken = longTokenData.access_token || tokenData.access_token

    // Get user info + pages + Instagram accounts
    const [userRes, pagesRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`),
      fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account%7Bid,username%7D&access_token=${accessToken}`),
    ])

    const user = await userRes.json()
    const pages = await pagesRes.json()

    // If me/accounts returns empty, try fetching pages user has access to
    let pagesData = pages.data || []
    if (pagesData.length === 0) {
      // Fallback: get pages from user's permissions
      const permPagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
      )
      const permPages = await permPagesRes.json()
      if (permPages.data?.length > 0) {
        // Fetch full details for each page
        const pageDetails = await Promise.all(
          permPages.data.map(async (p: { id: string }) => {
            const res = await fetch(
              `https://graph.facebook.com/v21.0/${p.id}?fields=id,name,access_token,instagram_business_account%7Bid,username%7D&access_token=${accessToken}`
            )
            return res.json()
          })
        )
        pagesData = pageDetails.filter((p: { error?: unknown }) => !p.error)
      }
    }

    // Build connection info
    const connectionInfo = {
      accessToken,
      userId: user.id,
      userName: user.name,
      pages: pagesData.map((page: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username: string } }) => ({
        id: page.id,
        name: page.name,
        pageAccessToken: page.access_token,
        instagram: page.instagram_business_account ? {
          id: page.instagram_business_account.id,
          username: page.instagram_business_account.username,
        } : null,
      })) || [],
      connectedAt: new Date().toISOString(),
    }

    // Redirect back with token in URL (client will store it)
    const encoded = encodeURIComponent(JSON.stringify(connectionInfo))
    return NextResponse.redirect(new URL(`/settings?meta_connected=${encoded}`, req.url))
  } catch (err) {
    return NextResponse.redirect(new URL('/settings?meta_error=' + String(err), req.url))
  }
}
