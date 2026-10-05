const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('node:path');
const productRoutes = require('./routes/productRoutes');
const { createProblem, problemDetails } = require('./middlewares/problemDetails');

const app = express();
const openApi = YAML.load(path.join(__dirname, 'openapi.yaml'));

app.use(express.json());
app.use('/api/v1/products', productRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApi));
app.use((req, res, next) => next(createProblem(404, 'Not Found', `Aucune route ne correspond à ${req.method} ${req.originalUrl}.`)));
app.use(problemDetails);

module.exports = app;
