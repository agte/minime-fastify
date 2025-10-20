export default (app, fastify) => {
  fastify.post('/token', {
    schema: {
      description: 'Получить токен доступа',
      tags: ['Доступ'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          password: { type: 'string' }
        },
        required: ['email', 'password']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { type: 'number' }
          },
          required: ['token', 'user']
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;
    if (email !== 'test@example.com') {
      return reply.forbidden('Не найден юзер с таким логином');
    }
    if (password !== 'qwerty') {
      return reply.forbidden('Пароль неверный');
    }
    const token = await reply.jwtSign({ id: -1 });
    return {
      token,
      user: 1
    };
  });

  fastify.get('/book/:id', {
    schema: {
      description: 'Книга по номеру',
      tags: ['Библиотека'],
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
    if (request.params.id === 1) {
      return { id: 1, title: 'Pride and prejudice', author: 'Jane Austen' };
    } else {
      return reply.notFound('Книга не найдена');
    }
  });

  fastify.get('/privateSection', {
    config: { auth: true },
    schema: {
      description: 'Закрытая секция для избранных',
      tags: ['Библиотека'],
      response: {
        200: { type: 'string' }
      }
    }
  }, async () => 'Some private data');
};
