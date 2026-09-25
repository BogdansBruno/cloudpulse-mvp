# CloudPulse MVP — Контекст проекта

## Статус (16.09.2026)
- ✅ TypeScript проверка: PASSED
- ✅ Production build: PASSED
- ✅ Anthropic API key: ROTATED
- ✅ Vercel env vars: UPDATED
- 🚀 Ready for Stage 2 submission (deadline: 06.11.2026)

## Ключевые файлы (исправлены 16.09.2026)

### lib/claude-agent.ts
- Модель: `claude-sonnet-5` (claude-opus-4-1 был заморожен)
- Переменная окружения: `CLAUDE_MODEL` (можно переключить на claude-haiku-4-5 для экономии)
- Добавлена поддержка истории разговоров: `ChatTurn[]` type
- Система промпт: поддержка Latvian/Russian/English

### lib/supabase-server.ts (новый файл)
- Сервер-сайд Supabase клиент для верификации токенов
- Функция: `getUserFromToken(accessToken)` возвращает пользователя или null

### app/api/chat/route.ts (полностью переписан)
- 3-слойная защита:
  1. Auth: требует Supabase access token в Authorization header
  2. Rate limiting: 40 сообщений/час per user
  3. Input validation: сообщение 1-2000 символов, история должна быть валидна
- Вызывает реальный Claude API с историей разговора
- Возвращает: `{ role: 'assistant', content: string }`

### app/(main)/chat/page.tsx
- Добавлена аутентификация: получает access token из Supabase session
- Отправляет token в Authorization header
- Передаёт историю разговора в API
- Гибкий парсинг ответа

## Переменные окружения (Vercel Production)
⚠️ **ВНИМАНИЕ:** Никогда не коммитьте API keys в код!
Используйте только переменные окружения Vercel или .env.local (в .gitignore)

```
NEXT_PUBLIC_SUPABASE_URL=https://pgfhvvetujsvigesueib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_e31uMP0u_IanxL0z2NsLfw_lhxDSqm1
ANTHROPIC_API_KEY=[SET IN VERCEL ENV VARS - DO NOT COMMIT]
```

## Перед Stage 2 testing:
- [ ] Enable Row Level Security на всех 4 таблицах Supabase (profiles, workout_plans, workout_sessions, messages)
- [ ] Пригласить 10-15 тестеров для юзер-тестирования
- [ ] Проверить чат работает end-to-end: https://cloudpulse-mvp.vercel.app/chat

## Следующие шаги:
1. Vercel автоматически перезагружает проект с новым ANTHROPIC_API_KEY
2. Проверить что чат работает с реальным Claude (не mock)
3. Включить RLS policies для безопасности
4. Начать юзер-тестирование

## Заметки для будущих сеансов
- TypeScript check: `npx tsc --noEmit` (должно быть чистым)
- Build: `npm run build` (должен пройти без ошибок)
- Все файлы находятся в `C:\Users\bogdan\my-cloudpulse\`
- GitHub repo: https://github.com/BogdansBruno/cloudpulse-mvp