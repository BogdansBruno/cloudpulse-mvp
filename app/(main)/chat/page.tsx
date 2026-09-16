import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const userMessage = body.message || 'Привет'

    // Фронтенд считывает ровно поле "response"
    return NextResponse.json({
      success: true,
      response: `[CloudPulse Coach]: Отлично! Я получил твоё сообщение: "${userMessage}". Мок-система работает штатно.`
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      response: 'Произошла ошибка при обработке запроса.'
    }, { status: 200 })
  }
}