import { describe, test, before, after } from 'node:test';
import { equal, ok } from 'node:assert';
import Application from '@minime/core';
import minimeFastify from '@minime/fastify';

const app = new Application(null, [minimeFastify]);
const baseUrl = `http://localhost:${app.config.fastify.port}`;

let token;

describe('Тестируем веб-сервер', async () => {
  before(async () => app.start());
  after(async () => app.stop());

  test('login', async () => {
    const response = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'qwerty'
      })
    });
    equal(response.status, 200);
    const data = await response.json();
    equal(data.user, 1);
    ok(data.token);
    token = data.token;
  });

  test('200', async () => {
    const response = await fetch(`${baseUrl}/book/1`);
    equal(response.status, 200);
    const book = await response.json();
    equal(book.id, 1);
    ok(book.title);
    ok(book.author);
  });

  test('401', async () => {
    const response = await fetch(`${baseUrl}/privateSection`);
    equal(response.status, 401);
  });

  test('authorized request', async () => {
    const response = await fetch(`${baseUrl}/privateSection`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    equal(response.status, 200);
  });
});