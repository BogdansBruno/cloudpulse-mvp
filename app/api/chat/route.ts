import { callClaudeAgent } from '@/lib/claude-agent';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({
      success: true,
      response:
        "Great! I'd love to help you with your training plan. Let's start with a few questions to understand your fitness level and goals.",
    });
  }

  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await callClaudeAgent(message);

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}