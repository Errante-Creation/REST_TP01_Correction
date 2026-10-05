const store = require('../data/productStore');
const { createProblem } = require('../middlewares/problemDetails');

function queryInteger(value, name, fallback, min, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value.trim())) {
    throw createProblem(422, 'Unprocessable Content', `${name} doit être un entier compris entre ${min} et ${max}.`, {
      invalidParams: [{ name, reason: `Valeur attendue : un entier entre ${min} et ${max}.` }]
    });
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw createProblem(422, 'Unprocessable Content', `${name} doit être un entier compris entre ${min} et ${max}.`, {
      invalidParams: [{ name, reason: `Valeur attendue : un entier entre ${min} et ${max}.` }]
    });
  }
  return parsed;
}

function productId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw createProblem(400, 'Bad Request', 'L’identifiant du produit doit être un entier positif.');
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw createProblem(400, 'Bad Request', 'L’identifiant du produit doit être un entier positif.');
  }
  return id;
}

function validateProduct(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const invalidParams = [];
  for (const name of Object.keys(body)) {
    if (!['name', 'price', 'category'].includes(name)) invalidParams.push({ name, reason: 'Propriété non autorisée.' });
  }
  if (typeof body.name !== 'string' || body.name.trim().length < 3) {
    invalidParams.push({ name: 'name', reason: 'Le nom doit comporter au moins 3 caractères.' });
  }
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price <= 0) {
    invalidParams.push({ name: 'price', reason: 'Le prix doit être un nombre strictement positif.' });
  }
  if (typeof body.category !== 'string' || !body.category.trim()) {
    invalidParams.push({ name: 'category', reason: 'La catégorie est obligatoire.' });
  }
  return {
    invalidParams,
    product: {
      name: typeof body.name === 'string' ? body.name.trim() : body.name,
      price: body.price,
      category: typeof body.category === 'string' ? body.category.trim() : body.category
    }
  };
}

function requireValidProduct(input) {
  const { invalidParams, product } = validateProduct(input);
  if (invalidParams.length) {
    throw createProblem(422, 'Unprocessable Content', 'Le corps de la requête contient des propriétés invalides.', { invalidParams });
  }
  return product;
}

function list(req, res) {
  const cursor = queryInteger(req.query.cursor, 'cursor', 0, 0, Number.MAX_SAFE_INTEGER);
  const limit = queryInteger(req.query.limit, 'limit', 10, 1, 50);5
  const category = req.query.category;
  if (category !== undefined && (typeof category !== 'string' || !category.trim())) {
    throw createProblem(422, 'Unprocessable Content', 'category doit être une chaîne non vide.');
  }
  res.json(store.page({ cursor, limit, category }));
}

function get(req, res) {
  const product = store.get(productId(req.params.id));
  if (!product) throw createProblem(404, 'Not Found', 'Le produit demandé n’existe pas.');
  res.json(product);
}

function create(req, res) {
  const product = store.create(requireValidProduct(req.body));
  res.location(`/api/v1/products/${product.id}`).status(201).json(product);
}

function replace(req, res) {
  const id = productId(req.params.id);
  const product = store.replace(id, requireValidProduct(req.body));
  if (!product) throw createProblem(404, 'Not Found', 'Le produit demandé n’existe pas.');
  res.json(product);
}

function remove(req, res) {
  const deleted = store.remove(productId(req.params.id));
  if (!deleted) throw createProblem(404, 'Not Found', 'Le produit demandé n’existe pas.');
  res.status(204).end();
}

module.exports = { list, get, create, replace, remove };
