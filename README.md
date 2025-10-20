# @minime/fastify

Веб-сервер для минифреймворка minime на основе Fastify.

## Возможности

- Автоматическая настройка Fastify сервера
- Встроенная поддержка JWT аутентификации с проверкой ролей
- Автоматическая генерация OpenAPI документации
- Статические файлы из папки `public/`
- CORS поддержка
- Автоматическая загрузка маршрутов и схем из модулей

## Установка

```bash
npm install @minime/fastify
```

## Использование

```javascript
import Application from '@minime/core';
import minimeFastify from '@minime/fastify';

const app = new Application(null, [minimeFastify]);
await app.start();
```

## Конфигурация

Добавьте в конфигурацию приложения секцию `fastify`:

```javascript
export default {
  fastify: {
    host: 'localhost',     // по умолчанию
    port: 3000,           // по умолчанию
    auth: {
      secret: 'your-jwt-secret'  // обязательный для JWT
    }
  }
}
```

## Структура приложения

Плагин добавляет в приложение поле `app.fastify` - экземпляр Fastify сервера.

### Автоматическая загрузка маршрутов

Плагин автоматически сканирует модули приложения и загружает:
- **Маршруты** из файлов `routes.js` в каждом модуле
- **Схемы** из папок `schemas/` в каждом модуле

Структура модуля:
```
src/
  modules/
    myModule/
      routes.js          # маршруты модуля
      schemas/           # схемы для валидации
        User.js
        Product.js
```

### Пример маршрута

```javascript
// src/modules/library/routes.js
export default (app, fastify) => {
  fastify.get('/books/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      },
      response: {
        200: { $ref: 'Book#' }
      }
    }
  }, async (request, reply) => {
    // обработка запроса
  });
};
```

### Аутентификация

Для защиты маршрута добавьте в конфигурацию `config.auth`:

```javascript
fastify.get('/protected', {
  config: { 
    auth: true  // требует аутентификации
  }
}, handler);

fastify.get('/admin', {
  config: { 
    auth: { 
      roles: ['admin', 'moderator']  // требует определенные роли
    }
  }
}, handler);
```

## API документация

После запуска приложения документация доступна по адресу:
- `/docs` - интерактивная документация API

## Валидация и преобразование типов

Плагин автоматически включает `coerceTypes` в AJV, что позволяет автоматически преобразовывать типы параметров в соответствии со схемой. Например, строковые параметры автоматически преобразуются в числа, если в схеме указан тип `number`.

Подробнее см. [таблица преобразования типов](https://ajv.js.org/coercion.html).