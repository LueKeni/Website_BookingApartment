const notFound = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

const errorHandler = (err, req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Payload too large. Please use a smaller image.'
    });
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Each image must be 5 MB or smaller.'
    });
  }

  if (err?.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'You can upload up to 8 images for each apartment.'
    });
  }

  if (err?.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed.'
    });
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

export { notFound, errorHandler };
