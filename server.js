const app = require('./app');

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`[TP1] API active sur http://localhost:${port} (documentation sur /api/docs)`);
});
