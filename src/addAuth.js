import jwt from '@fastify/jwt';

export default function addAuth(globalAuthConfig) {
  if (!globalAuthConfig.secret) {
    throw Error('Не задан секрет для JWT в настройках веб-сервера');
  }

  this.fastify.register(jwt, { secret: globalAuthConfig.secret });

  this.fastify.addSchema({
    $id: 'unauthorized',
    type: 'object',
    properties: {
      code: { const: 'unauthorized' },
      reason: { type: 'string' }
    }
  });

  this.fastify.addSchema({
    $id: 'insufficient_permissions',
    type: 'object',
    properties: {
      code: { const: 'insufficient_permissions' },
      currentRole: { type: 'string' },
      requiredRoles: { type: 'array', items: { type: 'string' }}
    }
  });

  this.fastify.addHook('onRoute', (routeOptions) => {
    const authConfig = routeOptions.config?.auth;
    if (!authConfig) {
      return;
    }

    routeOptions.schema.security = [{ jwt: [] }];
    if (!routeOptions.schema.response) {
      routeOptions.schema.response = {};
    }
    routeOptions.schema.response['401'] = { $ref: 'unauthorized#' };

    let roles;
    if (typeof authConfig === 'boolean') {
      routeOptions.config.auth = {};
    }
    else if (typeof authConfig === 'string') { // single role
      roles = [authConfig];
    }
    else if (Array.isArray(authConfig)) { // multiple roles
      roles = authConfig;
    }
    else if (authConfig.roles) {
      if (Array.isArray(authConfig.roles)) {
        roles = authConfig.roles;
      } else {
        this.logger.warn('Неправильная конфигурация авторизация роута', routeOptions.config);
        delete authConfig.roles;
      }
    }

    if (roles) {
      routeOptions.config.auth = { roles };
      routeOptions.schema.response['403'] = { $ref: 'insufficient_permissions#' };
    }
  });

  this.fastify.addHook('preHandler', async (request, reply) => {
    const authConfig = request.routeOptions.config?.auth;
    if (!authConfig) {
      return;
    }

    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ code: 'unauthorized', reason: err.code });
      return;
    }

    if (authConfig.roles) {
      const role = request.user.role;
      if (!role || !authConfig.roles.includes(role)) {
        reply.code(403).send({
          code: 'insufficient_permissions',
          currentRole: role,
          requiredRoles: authConfig.roles.join()
        });
        return;
      }
    }
  });
}