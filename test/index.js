import { Application } from '@minime/core';
import minimeFastify from '@minime/fastify';

const app = new Application(null, [minimeFastify]);
await app.start();