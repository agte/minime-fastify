import { createRequire } from 'node:module';
import { join } from 'node:path';
import { accessSync } from 'node:fs';
import Plugin from '@minime/core/Plugin';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import serveStatic from '@fastify/static';
import apiReference from '@scalar/fastify-api-reference';
import ajvFormats from 'ajv-formats';
import ajvKeywords from 'ajv-keywords';

const importSync = createRequire(import.meta.url);

export default class FastifyPlugin extends Plugin {
  fastify;

  constructor(...args) {
    super(...args);

    if (!this.app.config.fastify) {
      throw Error('Не заданы настройки веб-сервера');
    }
    const config = this.app.config.fastify;
    const packageInfo = this.app.config.packageInfo;

    if (!config.host) {
      config.host = 'localhost';
    }
    if (!config.port) {
      config.port = 3000;
      this.logger.warn('Не задан порт для веб-сервера. По умолчанию выставлен порт 3000');
    }

    if (this.app.fastify) {
      throw Error('Имя fastify уже занято в приложении чем-то другим');
    }

    this.fastify = Fastify({
      loggerInstance: this.logger,
      forceCloseConnections: true,
      disableRequestLogging: true,
      ajv: {
        plugins: [ajvFormats, ajvKeywords],
        customOptions: {
          strict: false
        }
      }
    });
    this.app.fastify = this.fastify;

    this.fastify.register(cors, { origin: true });

    this.fastify.setErrorHandler((error, request, reply) => {
      if (error.validation) {
        reply.status(400).send({
          code: 'validation_failed',
          details: error.validation
        });
      } else {
        this.logger.error({
          reqId: request.id,
          url: request.url,
          method: request.method,
          error,
          stackTrace: error.stack
        });
        reply.status(500).send({ code: 'unknown_error' });
      }
    });

    const publicDirPath = join(this.app.path, 'public');
    try {
      accessSync(publicDirPath);
      this.fastify.register(serveStatic, { root: publicDirPath });
    } catch (err) {}

    if (config.auth) {
      if (!config.auth.secret) {
        throw Error('Не задан секрет для JWT в настройках веб-сервера');
      }
      this.fastify.register(jwt, { secret: config.auth.secret });

      this.fastify.addHook('onRoute', (routeOptions) => {
        const authConfig = routeOptions.config?.auth;
        if (authConfig) {
          routeOptions.schema.security = [{ jwt: [] }];

          if (typeof authConfig === 'boolean') {
            routeOptions.config.auth = {};
          } else if (typeof authConfig === 'string') { // single role
            routeOptions.config.auth = { roles: [authConfig] };
          } else if (Array.isArray(authConfig)) { // multiple roles
            routeOptions.config.auth = { roles: authConfig };
          } else if (authConfig.roles && Array.isArray(authConfig.roles)) {
            // do nothing
          } else if (typeof authConfig === 'object' && authConfig.roles) {
            delete authConfig.roles;
            this.logger.warn('Неправильная конфигурация роута', routeOptions.config);
          }
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
          return reply.code(401).send({ code: err.code });
        }

        if (config.roles) {
          const role = request.user.role;
          if (!role || !config.roles.includes(role)) {
            return reply.code(403).send({
              code: 'insufficient_permissions',
              currentRole: role,
              requiredRoles: config.roles.join()
            });
          }
        }
      });
    }

    this.fastify.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: packageInfo.name,
          description: packageInfo.description,
          version: packageInfo.version
        },
        components: {
          securitySchemes: {
            jwt: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            }
          }
        }
      }
    });

    this.fastify.get('/', {
      schema: {
        summary: 'Кратко о приложении',
        tags: ['Общее']
      },
    }, () => ({
      name: packageInfo.name,
      version: packageInfo.version,
      description: packageInfo.description,
    }));

    // Бизнес-логика
    for (const files of Object.values(this.app.fileTree.modules ?? {})) {
      if (files.routes) {
        const registerRoutes = importSync(files.routes).default;
        const wrapper = (server) => {
          if (files.schemas) {
            Object.values(files.schemas).forEach((filePath) => {
              const schema = importSync(filePath).default;
              server.addSchema(schema);
            });
          }
          registerRoutes(this.app, server);
        };
        this.fastify.register(wrapper);
      }
    }

    this.fastify.register(apiReference, {
      routePrefix: '/docs',
      configuration: {
        layout: 'classic',
        theme: 'mars'
      }
    });
  }

  async start() {
    const config = this.app.config.fastify;
    await this.fastify.listen({
      port: config.port,
      host: config.host,
    });
  }

  async stop() {
    await this.fastify.close();
  }
}
