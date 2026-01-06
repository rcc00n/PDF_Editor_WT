# RelayForms Frontend (rewrite)

Готовый фронт-проект (Vite + React + TypeScript + Tailwind) с UX как у твоего текущего демо:
- Dashboard (статусы синка, формы, тикеты, активность)
- Forms (шаблоны, версии)
- Form Builder (PDF upload + поля поверх PDF, свойства поля)
- Field App (офлайн-черновики, вложения, подпись, submit → очередь)
- Sync Queue (pending / in progress / failed / synced, retry)
- Admin Review & Export (preview, attachments, export PDF/CSV, approve)

## Запуск локально
```bash
npm install
npm run dev
```

Открой: http://localhost:5173

## Сборка
```bash
npm run build
npm run preview
```

## Как это работает (front-only)
- Данные и изменения сохраняются в `localStorage` (zustand persist) — это демо.
- Очередь синка симулируется: когда онлайн, элементы из `queue` автоматически “синкятся” с небольшой вероятностью ошибки.
- PDF рендерится через `pdfjs-dist` (если PDF загружен).
- Export PDF/CSV работает на фронте (jsPDF + генерация CSV).

## Быстрые фишки
- Command Palette: Ctrl/⌘ + K
- Dark mode toggle
- Offline simulation toggle (кнопка Online/Offline в шапке)

## Подключение реального API
Сейчас это mock/offline. Когда будет бэкенд:
- вынеси “синк” из `useQueueProcessor` в реальные запросы (fetch/axios)
- замени local storage на API + indexedDB для offline-queue
