# NeuroBench

**NeuroBench** — серия бенчмарков для LLM-моделей, проверяющих способность генерировать структурированный визуальный код: SVG-графику, GPU-шейдеры (GLSL) и 3D воксельные сцены. Каждый промпт тестируется 3 раза — выбирается лучший результат. Оценка по 5 критериям (визуал, анимация, креатив, код, детали), каждый от 0 до 10. Итоговый балл: `сумма × 1.8`, максимум 90.

Сайт задеплоен на **GitHub Pages**, бэкенд — **Supabase** (бесплатный план).

## Структура проекта

```
├── index.html              Главная (о проекте, hero-секция)
├── svg.html                SVG бенчмарк + лидерборд
├── voxel.html              Voxel бенчмарк (coming soon)
├── shader.html             Shader бенчмарк (coming soon)
├── forum.html              Форум сообщества
├── profile.html            Профиль пользователя
├── register.html           Вход через Telegram
├── logo.png / logo2.png   Логотипы
├── css/
│   ├── style.css           Основные стили (podium, форум, профиль)
│   └── profile2.css        Двухколоночный профиль (v2)
├── js/
│   ├── config.js           Supabase URL/Key, Telegram Bot
│   ├── api.js              Вся работа с Supabase (RPC, таблицы, Edge Functions)
│   ├── auth.js             Авторизация через Telegram
│   ├── main.js             Инициализация главной, трекинг, меню
│   ├── leaderboard.js      Лидерборд (фильтры, рендер карточек, анимации)
│   ├── navbar.js           Общая навигация (dropdown лидерборда)
│   ├── forum.js            Форум (треды, посты, модерация)
│   ├── profile.js          Профиль (bio, инвайты, аккаунт)
│   ├── shader.js           WebGL-шейдер для фона
│   └── title-scramble.js   Анимация заголовка вкладки
└── admin/
    ├── index.html          Админ-панель
    ├── js/admin.js         Логика админки
    └── css/admin.css       Стили админки
```

## Supabase

Проект использует **бесплатный план Supabase** как единственный бэкенд. Данные хранятся в PostgreSQL, доступ — через клиентскую библиотеку `@supabase/supabase-js@2` из CDN.

### Таблицы

| Таблица | Назначение |
|---|---|
| `prompts` | Промпты бенчмарка (difficulty: easy/medium/hard, text, name) |
| `models` | Глобальный справочник моделей (name) |
| `model_spaces` | Пространства тестирования (макро: AI Studio, ChatGPT и т.д.) |
| `model_params` | Параметры модели (микро: Thinking mode, Tools и т.д.) |
| `model_param_values` | Значения параметров (High, Low, On, Off) |
| `results` | Результаты тестов (5 оценок, overall, svg_content, author, test_date) |
| `result_param_values` | Связь результатов со значениями параметров |
| `profiles` | Профили пользователей (telegram данные, bio, verification) |
| `invite_codes` | Инвайт-коды (код, лимит, использований, создатель) |
| `admin_users` | Администраторы (user_id → auth.users) |
| `moderators` | Модераторы форума (user_id, telegram_id, telegram_username) |
| `forum_categories` | Категории форума (name, slug, sort_order) |
| `forum_threads` | Темы форума (title, content, author, pinned, locked) |
| `forum_posts` | Посты форума (content, author, edited_at) |
| `page_views` | Статистика посещений (visitor_hash, page, referrer) |

### RPC-функции (PostgreSQL)

**Аутентификация и пользователи:**
- `get_user_display_name()` — имя, фото, статус верификации, инвайт
- `get_user_invite_status()` — статус инвайт-кода пользователя
- `claim_invite_code(p_code)` — использовать инвайт-код при регистрации
- `generate_user_invite_code()` — сгенерировать свой инвайт-код

**Форум:**
- `get_forum_threads(p_category_id, p_limit, p_offset)` — список тредов
- `get_forum_threads_count(p_category_id)` — количество тредов
- `get_forum_thread_posts(p_thread_id, p_limit, p_offset)` — посты треда
- `get_forum_thread_posts_count(p_thread_id)` — количество постов
- `create_forum_thread(p_category_id, p_title, p_content)` — создать тред
- `create_forum_post(p_thread_id, p_content)` — создать пост
- `update_forum_post(p_post_id, p_content)` — редактировать пост
- `update_forum_thread(p_thread_id, p_title, p_content)` — редактировать тред

**Модерация:**
- `is_moderator()` — проверка, является ли пользователь модератором
- `mod_pin_thread(p_thread_id, p_pin)` — закрепить/открепить тред
- `mod_lock_thread(p_thread_id, p_lock)` — заблокировать/разблокировать тред
- `mod_delete_thread(p_thread_id)` — удалить тред
- `mod_delete_post(p_post_id)` — удалить пост
- `mod_ban_user(p_user_id, p_reason, p_expires_at)` — забанить пользователя
- `mod_mute_user(p_user_id, p_reason, p_expires_at)` — заглушить пользователя
- `mod_unban_user(p_user_id)` — снять бан
- `mod_unmute_user(p_user_id)` — снять мут
- `get_user_mod_actions(p_user_id)` — история модерационных действий

**Профили:**
- `get_public_profile(p_user_id)` — публичный профиль (имя, статистика, bio)
- `update_profile_bio(p_bio)` — обновить био

**Администрирование:**
- `admin_get_invite_codes()` — все инвайт-коды
- `admin_generate_invite_code(p_max_uses)` — создать админский инвайт
- `admin_delete_invite_code(p_id)` — удалить инвайт
- `admin_get_profiles()` — все профили пользователей
- `admin_reset_user_invite_limit(p_user_id)` — сбросить лимит инвайтов
- `admin_reset_all_invite_limits()` — сбросить лимиты всем
- `admin_assign_moderator(p_user_id)` — назначить модератора
- `admin_remove_moderator(p_user_id)` — снять модератора
- `admin_get_moderators()` — список модераторов

### Edge Functions

**`telegram-auth`** — аутентификация через Telegram Login Widget:
- Принимает `auth_data` (данные от Telegram) и опциональный `invite_code`
- Верифицирует HMAC-SHA256 подпись Telegram
- Создаёт/находит пользователя в `auth.users` и `profiles`
- Возвращает `access_token`, `refresh_token`, `is_new`

**`admin-action`** — административные действия:
- Требует авторизацию (Bearer token администратора)
- Поддерживаемые action: `delete_user` — удаление пользователя через Supabase Auth Admin API

### Аутентификация

1. **Пользователи**: Telegram Login Widget → Edge Function `telegram-auth` → JWT сессия Supabase
2. **Администраторы**: Email/Password (через Supabase Auth) + проверка в таблице `admin_users`
3. **RLS (Row Level Security)**: все таблиц защищены политиками — пользователи могут читать данные и писать только в разрешённые таблицы/RPC

### Настройка Supabase с нуля

1. Создать проект на [supabase.com](https://supabase.co) (бесплатный план)
2. Выполнить SQL-миграции в SQL Editor (порядок важен):
   - Создание таблиц, RLS-политик и RPC-функций
3. Зарегистрировать Telegram бота через [@BotFather](https://t.me/BotFather), задать `@neurobenchbot` домен для Login Widget
4. Деплой Edge Functions:
   ```bash
   supabase functions deploy telegram-auth
   supabase functions deploy admin-action
   ```
5. Обновить `js/config.js`:
   ```js
   window.SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
   window.SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   window.TELEGRAM_BOT_USERNAME = 'neurobenchbot';
   ```
6. Создать администратора: через Supabase Dashboard → Authentication → Create User, затем вручную добавить `user_id` в таблицу `admin_users`

## Разработка

Статический фронтенд, никакого сборщика. Tailwind CSS и Supabase JS загружаются из CDN. Для локальной разработки достаточно любого HTTP-сервера:

```bash
npx serve .
```

В `register.html` есть кнопка **Dev Login** для локальной разработки — создаёт фейковый аккаунт без реальной Telegram-авторизации.
