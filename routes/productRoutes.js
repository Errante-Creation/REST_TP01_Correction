const express = require('express');
const products = require('../controllers/productController');

const router = express.Router();

router.get('/', products.list);
router.post('/', products.create);
router.get('/:id', products.get);
router.put('/:id', products.replace);
router.delete('/:id', products.remove);

module.exports = router;
