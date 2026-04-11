export async function POST(req: Request) {
  const body = await req.json()
  const seoServiceUrl = process.env.SEO_SERVICE_URL || 'http://localhost:8000'
  try {
    const response = await fetch(`${seoServiceUrl}/analyze/readability`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return Response.json(await response.json())
  } catch {
    return Response.json({ error: 'SEO service unavailable' }, { status: 503 })
  }
}
