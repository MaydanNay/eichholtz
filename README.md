# Eichholtz Казахстан

Сайт мебельного бренда Eichholtz с админ-панелью для управления товарами, заказами и новостями.

**Стек:** React, Vite, Express, PostgreSQL, Docker

## Требования

- Docker + Docker Compose
- Node.js 22+ (только для локальной разработки)

## Быстрый старт (Docker)

1. Скопировать переменные окружения:

```bash
cp .env.example .env
```

2. При необходимости отредактировать `.env`:

| Переменная | Описание |
|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Логин в админку |
| `JWT_SECRET` | Секрет для токенов (минимум 16 символов) |
| `APP_PORT` | Порт сайта (по умолчанию `3000`) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | База данных |

3. Запустить:

```bash
npm run docker:up
```

или:

```bash
docker compose up --build -d
```

4. Открыть в браузере:

- Сайт: http://localhost:3000
- Админка: http://localhost:3000/admin/login

5. Остановить:

```bash
npm run docker:down
```

## Вход в админку

По умолчанию (меняется в `.env`):

| | |
|---|---|
| Email | `donttouchegoista@gmail.com` |
| Пароль | `admin123` |

## Локальная разработка

```bash
npm install
cp .env.example .env
npm run dev:db   # только PostgreSQL в Docker
npm run dev      # фронт + API локально
```

- Сайт: http://localhost:5173
- API: http://localhost:3001
- Админка: http://localhost:5173/admin/login

## Полезные команды

| Команда | Описание |
|---|---|
| `npm run docker:up` | Собрать и запустить Docker |
| `npm run docker:down` | Остановить Docker |
| `npm run dev:db` | Запустить только Postgres |
| `npm run dev` | Фронт (Vite) + API локально |
| `npm run build` | Собрать фронтенд |
| `npm run start` | Production-сервер (нужен `build` + Postgres) |
| `npm run lint` | Проверка кода |

## Проверка работы

```bash
curl http://localhost:3000/api/health
```

Ожидаемый ответ:

```json
{"status":"ok","db":"connected"}
```

```bash
docker compose ps
```

## Структура проекта

```
src/                    — React-фронтенд (сайт + админка)
server/                 — Express API
docker-compose.yml      — полный запуск (app + postgres)
docker-compose.dev.yml  — только postgres для dev
.env                    — настройки (не коммитить!)
```

## Заметки

- Данные Postgres хранятся в Docker volume `pgdata`
- При смене `APP_PORT` сайт будет на другом порту
- Для продакшена обязательно сменить пароли и `JWT_SECRET` в `.env`
