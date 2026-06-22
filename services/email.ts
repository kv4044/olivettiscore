interface RewardRedemptionEmail {
  to: string
  firstName?: string
  rewardName: string
  pointsSpent: number
  remainingPoints: number
  redemptionId?: string
}

interface EmailResult {
  success: boolean
  error?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function sendRewardRedemptionEmail({
  to,
  firstName,
  rewardName,
  pointsSpent,
  remainingPoints,
  redemptionId,
}: RewardRedemptionEmail): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return { success: false, error: 'A variável RESEND_API_KEY não está configurada.' }
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Olivetti Score <onboarding@resend.dev>'
  const safeName = escapeHtml(firstName?.trim() || 'adepto')
  const safeRewardName = escapeHtml(rewardName)
  const formattedPoints = pointsSpent.toLocaleString('pt-PT', { maximumFractionDigits: 2 })
  const formattedBalance = remainingPoints.toLocaleString('pt-PT', { maximumFractionDigits: 2 })

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(redemptionId ? { 'Idempotency-Key': `reward-redemption/${redemptionId}` } : {}),
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Recompensa resgatada: ${rewardName}`,
        text: [
          `Olá${firstName ? `, ${firstName}` : ''}!`,
          '',
          `Confirmamos o resgate de: ${rewardName}.`,
          `Pontos utilizados: ${formattedPoints}.`,
          `Saldo restante: ${formattedBalance} pontos.`,
          '',
          'O teu pedido ficou registado e será processado pela equipa Olivetti Score.',
        ].join('\n'),
        html: `
          <div style="background:#09090b;padding:32px 16px;font-family:Arial,sans-serif;color:#e4e4e7">
            <div style="max-width:560px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:20px;overflow:hidden">
              <div style="padding:28px;background:linear-gradient(135deg,#312e81,#581c87)">
                <p style="margin:0 0 8px;color:#a5b4fc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Olivetti Score</p>
                <h1 style="margin:0;color:#fff;font-size:24px">Recompensa resgatada</h1>
              </div>
              <div style="padding:28px">
                <p style="margin:0 0 20px;line-height:1.6">Olá, ${safeName}!</p>
                <p style="margin:0 0 20px;line-height:1.6;color:#a1a1aa">O teu resgate foi confirmado e o pedido ficou registado.</p>
                <div style="padding:20px;background:#09090b;border:1px solid #27272a;border-radius:14px">
                  <p style="margin:0 0 8px;color:#818cf8;font-size:12px;font-weight:700;text-transform:uppercase">Recompensa</p>
                  <p style="margin:0 0 18px;color:#fff;font-size:18px;font-weight:700">${safeRewardName}</p>
                  <p style="margin:0 0 6px;color:#a1a1aa;font-size:13px">Pontos utilizados: <strong style="color:#fff">${formattedPoints}</strong></p>
                  <p style="margin:0;color:#a1a1aa;font-size:13px">Saldo restante: <strong style="color:#fff">${formattedBalance} pontos</strong></p>
                </div>
                <p style="margin:20px 0 0;color:#71717a;font-size:12px;line-height:1.6">A equipa Olivetti Score irá processar o teu pedido.</p>
              </div>
            </div>
          </div>
        `,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text()
      return { success: false, error: `Resend respondeu com ${response.status}: ${body}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar o e-mail.',
    }
  }
}
