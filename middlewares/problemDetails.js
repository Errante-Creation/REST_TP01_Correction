const titles = { 400: 'Bad Request', 404: 'Not Found', 413: 'Content Too Large', 422: 'Unprocessable Content' };

function createProblem(status, title, detail, extensions = {}) {
  return Object.assign(new Error(detail), { status, title, extensions });
}

function problemDetails(error, req, res, next) {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
  const detail = error.type === 'entity.parse.failed'
    ? 'Le corps de la requête doit contenir un JSON valide.'
    : status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Une erreur inattendue est survenue.'
      : error.message;
  const body = {
    type: error.problemType || 'about:blank',
    title: error.title || titles[status] || 'Internal Server Error',
    status,
    detail,
    instance: req.originalUrl,
    ...error.extensions
  };
  res.type('application/problem+json').status(status).json(body);
}

module.exports = { createProblem, problemDetails };
