import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessage = body.message || 'Привет';

    return NextResponse.json({
      response: `[CloudPulse Coach]: Отлично! Я получил твоё сообщение: "${userMessage}". Всё работает!`,
    });
  } catch (error) {
    return NextResponse.json({
      response: 'Произошла ошибка при обработке запроса.',
    });
  }
}