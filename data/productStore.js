const products = Array.from({ length: 45 }, (_, index) => ({
  id: index + 1,
  name: `Produit Pro #${index + 1}`,
  category: index % 2 === 0 ? 'electronics' : 'software',
  price: Number((29.99 + index * 5).toFixed(2)),
  createdAt: new Date(Date.now() - (45 - index) * 3600000).toISOString()
}));
let nextId = products.length + 1;

function page({ cursor, limit, category }) {
  // En production, l'index B-tree id (category, id) fournit le même seek que WHERE id > cursor ORDER BY id LIMIT limit + 1.
  let low = 0;
  let high = products.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (products[middle].id <= cursor) low = middle + 1;
    else high = middle;
  }

  const matches = [];
  for (let index = low; index < products.length && matches.length <= limit; index++) {
    const product = products[index];
    if (!category || product.category.toLowerCase() === category.trim().toLowerCase()) matches.push(product);
  }
  const hasMore = matches.length > limit;
  if (hasMore) matches.pop();
  const nextCursor = hasMore ? matches[matches.length - 1].id : null;
  return {
    data: matches,
    pagination: { limit, currentCursor: cursor, nextCursor, hasMore }
  };
}

function get(id) {
  return products.find(product => product.id === id);
}

function create(input) {
  const product = { id: nextId++, ...input, createdAt: new Date().toISOString() };
  products.push(product);
  return product;
}

function replace(id, input) {
  const index = products.findIndex(product => product.id === id);
  if (index === -1) return null;
  products[index] = { ...products[index], ...input };
  return products[index];
}

function remove(id) {
  const index = products.findIndex(product => product.id === id);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}

module.exports = { page, get, create, replace, remove };
