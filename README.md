# Officia – Интелигентният Офис Асистент

**Модерен ERP + AI офис софтуер за малки и средни фирми в България.**

Officia комбинира класическо счетоводство, фактуриране и управление на документи с мощни **AI възможности** – автоматично извличане на текст от сканирани документи, чат с AI върху твоите фактури и договори, и интелигентно съпоставяне на банкови транзакции.

---

## ✨ Основни функции

- **Счетоводство**  
  Сметкоплан, журнални записи, ДДС дневници, баланс, отчет за приходи и разходи, амортизация.

- **Фактуриране**  
  Създаване и управление на продажбени и покупни фактури.

- **Документи + AI**  
  Качвай PDF/снимки → AI (Claude Vision) извлича текста автоматично → **чат директно с документа**.

- **Банкиране**  
  Автоматична синхронизация чрез PSD2 (Nordigen/GoCardless) + **AI съпоставяне** на транзакции с разходи.

- **Контрагенти & HR**  
  Управление на клиенти, доставчици и служители.

- **Dashboard**  
  Красиви KPI-та, графики и бърз преглед на бизнеса.

### Технологии
- **Next.js 15** (App Router) + TypeScript + Tailwind + shadcn/ui
- **Clerk** – автентикация и multi-tenant
- **Drizzle ORM** + PostgreSQL
- **Anthropic Claude** – AI за документи и анализ
- Docker + CI/CD

---

## 🚀 Бърз старт

### Локално развитие

```bash
# 1. Клонирай репото
git clone https://github.com/lukezester-ai/officia.git
cd officia

# 2. Инсталирай зависимости
npm install

# 3. Настрой променливи (копирай .env.example → .env.local)
cp .env.example .env.local
# Windows (PowerShell):
# Copy-Item .env.example .env.local

# 4. Редактирай .env.local:
#    - DATABASE_URL вече е за локален Docker (виж docker-compose.yml)
#    - Задължително: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY (Clerk Dashboard)
#    - За AI: ANTHROPIC_API_KEY

# 5. Стартирай PostgreSQL (Docker — само базата, не целия app)
docker-compose up -d

# 6. Приложи миграции
npm run db:migrate
# или за dev без migration history:
npm run db:push

# 7. Стартирай Next.js на host машината
npm run dev
```

Отвори http://localhost:3000

### Docker

`docker-compose.yml` пуска **само PostgreSQL 15** (порт `5432`). Next.js се стартира с `npm run dev` на host — няма `Dockerfile` за production build в repo.

```bash
docker-compose up -d    # Postgres в background
docker-compose down     # спиране + запазване на volume db_data
docker-compose down -v  # спиране + изтриване на данните
```

Credentials (съвпадат с `.env.example`):
- user: `postgres`
- password: `postgrespassword`
- database: `officia`

### 🔧 Настройки за AI и Банки

- `ANTHROPIC_API_KEY` – за Anthropic Claude (OCR + чат)
- `OPENAI_API_KEY` – за Whisper транскрипция
- `DEEPGRAM_API_KEY` – за live speech (optional)
- `NORDIGEN_SECRET_ID` / `NORDIGEN_SECRET_KEY` – за банкови връзки (optional)
- `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` – кеш и rate limiting (optional; fallback in-memory locally)
- `CRON_SECRET` / `AI_WEBHOOK_SECRET` – за scheduled jobs и webhooks

### Database migrations

```bash
npm run db:generate   # след промяна на schema
npm run db:migrate      # apply migrations (production/CI)
npm run db:push         # direct sync (local dev only)
```

Migrations live in `drizzle/migrations/`.

### Тестове и CI

```bash
npm run lint
npm run typecheck
npm test              # Vitest (unit + lib + tax)
npm run test:e2e      # Playwright (изисква Clerk keys + E2E_CLERK_USER_EMAIL)
```

---

## 📌 Планове за развитие

- Публичен Live Demo
- Мобилно приложение (PWA вече е готово)
- Експорт към Excel / PDF отчети
- Многоезичност (BG/EN)
- Интеграции с e-FACT, e-invoicing и др.

---

## 👨‍💻 Автор
Създадено от lukezester-ai с ❤️ за българския бизнес.

**Готов си да автоматизираш офиса си?**
⭐ Star-вай проекта и следи развитието!

## Contributing
Pull requests са добре дошли! Ако искаш да помогнеш – отвори issue или пиши директно.
