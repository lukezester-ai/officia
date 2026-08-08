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
- **Clerk** – автентикация и multi-tenant (tenant-scoped RLS в PostgreSQL)
- **Drizzle ORM** + PostgreSQL (миграции чрез `npm run db:*`)
- **Anthropic Claude + OpenAI** – AI за документи, RAG и анализ
- Stripe (абонаменти), PWA, e-Invoicing (UBL 2.1) / НАП интеграции
- Docker + CI/CD

### 🛠️ Разработка
```bash
npm run typecheck   # проверка на типовете (tsc --noEmit)
npm run lint        # ESLint
npm run ci          # lint + typecheck + build
npm run db:studio   # Drizzle Studio (GUI за базата)
```

---

## 🚀 Бърз старт

### Локално развитие

```bash
# 1. Клонирай репото
git clone https://github.com/lukezester-ai/officia.git
cd officia

# 2. Инсталирай зависимости
npm install

# 3. Настрой променливите на средата в .env.local
#    (виж "Променливи на средата" по-долу; за production .env.production)

# 4. Стартирай базата (Docker)
docker-compose up -d

# 5. Генерирай и приложи миграции (Drizzle)
npm run db:generate
npm run db:migrate
# Или бърза синхронизация на схемата без миграционни файлове:
# npm run db:push

# 6. Провери типовете и стартирай
npm run typecheck
npm run dev
```

Отвори http://localhost:3000

### Docker (production-like)
```bash
docker-compose up --build
```

### 🔧 Настройки за AI и Банки

- `CLAUDE_API_KEY` – за Anthropic (OCR + чат)
- `NORDIGEN_SECRET_ID` / `NORDIGEN_SECRET_KEY` – за банкови връзки

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
