import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    // Возвращаем тестовый ответ без обращения к API
    return NextResponse.json({
      role: 'assistant',
      content: `[CloudPulse Coach]: Привет! Я получил твое сообщение: "${message}". Все системы работают нормально!`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}