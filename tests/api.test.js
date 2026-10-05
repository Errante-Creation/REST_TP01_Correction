const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const YAML = require('yamljs');
const app = require('../app');
const routes = require('../routes/productRoutes');
const controller = require('../controllers/productController');
const { problemDetails } = require('../middlewares/problemDetails');

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    location(value) { this.headers.location = value; return this; },
    type(value) { this.headers['content-type'] = `${value}; charset=utf-8`; return this; },
    json(value) { this.body = value; return this; },
    end() { this.ended = true; return this; }
  };
}

function invoke(handler, request) {
  const res = response();
  try {
    handler(request, res);
  } catch (error) {
    problemDetails(error, request, res);
  }
  return res;
}

test('TP1 API supports keyset pagination, resource CRUD, and RFC 7807 errors', () => {
  const firstPage = invoke(controller.list, { query: { limit: '2' } });
  assert.deepEqual(firstPage.body.data.map(product => product.id), [1, 2]);
  assert.equal(firstPage.body.pagination.nextCursor, 2);
  assert.equal(firstPage.body.pagination.hasMore, true);
  const secondPage = invoke(controller.list, { query: { limit: '2', cursor: '2' } });
  assert.deepEqual(secondPage.body.data.map(product => product.id), [3, 4]);
  const invalidCursor = invoke(controller.list, { query: { cursor: '' }, originalUrl: '/api/v1/products?cursor=' });
  assert.equal(invalidCursor.statusCode, 422);
  const nonCanonicalCursor = invoke(controller.list, { query: { cursor: '1e0' }, originalUrl: '/api/v1/products?cursor=1e0' });
  assert.equal(nonCanonicalCursor.statusCode, 422);
  const invalidId = invoke(controller.get, { params: { id: '1e0' }, originalUrl: '/api/v1/products/1e0' });
  assert.equal(invalidId.statusCode, 400);

  const product = invoke(controller.get, { params: { id: '1' } });
  assert.equal(product.body.id, 1);
  const missing = invoke(controller.get, { params: { id: '9999' }, originalUrl: '/api/v1/products/9999' });
  assert.equal(missing.statusCode, 404);
  assert.match(missing.headers['content-type'], /^application\/problem\+json/);
  assert.equal(missing.body.status, 404);

  const invalid = invoke(controller.create, {
    body: { name: 'AB', price: -1, category: '' },
    originalUrl: '/api/v1/products'
  });
  assert.equal(invalid.statusCode, 422);
  assert.match(invalid.headers['content-type'], /^application\/problem\+json/);
  assert.equal(invalid.body.invalidParams.length, 3);
  const wrongTypes = invoke(controller.create, {
    body: { name: 3, price: '129', category: {} },
    originalUrl: '/api/v1/products'
  });
  assert.equal(wrongTypes.statusCode, 422);

  const created = invoke(controller.create, {
    body: { name: 'Clavier mécanique', price: 129.99, category: 'electronics' }
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.headers.location, `/api/v1/products/${created.body.id}`);

  const replaced = invoke(controller.replace, {
    params: { id: String(created.body.id) },
    body: { name: 'Clavier remplacé', price: 99, category: 'hardware' }
  });
  assert.equal(replaced.body.name, 'Clavier remplacé');

  const deleted = invoke(controller.remove, { params: { id: String(created.body.id) } });
  assert.equal(deleted.statusCode, 204);
  assert.equal(deleted.ended, true);
  assert.equal(invoke(controller.get, { params: { id: String(created.body.id) } }).statusCode, 404);
});

test('the router and OpenAPI document describe the same CRUD operations', () => {
  const actual = routes.stack
    .filter(layer => layer.route)
    .flatMap(layer => Object.keys(layer.route.methods)
      .filter(method => ['get', 'post', 'put', 'delete'].includes(method))
      .map(method => `${method.toUpperCase()} ${layer.route.path}`))
    .sort();
  assert.deepEqual(actual, ['DELETE /:id', 'GET /', 'GET /:id', 'POST /', 'PUT /:id'].sort());

  const openApi = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
  assert.equal(openApi.openapi, '3.1.0');
  assert.deepEqual(Object.keys(openApi.paths['/api/v1/products']).sort(), ['get', 'post']);
  assert.deepEqual(Object.keys(openApi.paths['/api/v1/products/{id}'])
    .filter(method => ['get', 'put', 'delete'].includes(method)).sort(), ['delete', 'get', 'put']);
  assert.equal(openApi.paths['/api/v1/products'].get.responses['422'].$ref, '#/components/responses/Problem');
  assert.equal(openApi.components.responses.Problem.content['application/problem+json'].schema.$ref, '#/components/schemas/Problem');
  assert.ok(app._router.stack.some(layer => layer.regexp?.test('/api/docs')));
});

test('malformed JSON errors stay within the Problem Details contract', () => {
  const error = Object.assign(new SyntaxError('parser detail'), { status: 400, type: 'entity.parse.failed' });
  const problem = response();
  problemDetails(error, { originalUrl: '/api/v1/products' }, problem);
  assert.equal(problem.body.type, 'about:blank');
  assert.equal(problem.body.detail, 'Le corps de la requête doit contenir un JSON valide.');
  assert.match(problem.headers['content-type'], /^application\/problem\+json/);
});
