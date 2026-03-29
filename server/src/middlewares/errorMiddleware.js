const notFound = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

export { notFound, errorHandler };
