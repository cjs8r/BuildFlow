import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const {
      projectName,
      clientName,
      weekSummary,
      whatsNext,
      delays,
      progressPercent,
      amountSpent,
      plannedBudget,
      includeBudget,
    } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY secret is not set')

    const budgetLine = includeBudget
      ? `\nBudget note for the client: $${Number(amountSpent).toLocaleString()} spent of $${Number(plannedBudget).toLocaleString()} planned.`
      : ''

    const prompt = `You are writing a professional weekly progress update for a residential construction project on behalf of a contractor.

Project: ${projectName}
Client: ${clientName}
Overall completion: ${progressPercent}%${budgetLine}

What happened this week:
${weekSummary}

What's coming up next:
${whatsNext}

Delays or issues:
${delays || 'None to report.'}

Write a friendly, clear, professional client-facing update in first-person plural (we/our). Keep it to 3–4 short paragraphs. Do not include raw dollar amounts or budget data unless they appear in the budget note above. No greeting or sign-off — just the body paragraphs.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    return new Response(
      JSON.stringify({ report: data.content[0].text }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
