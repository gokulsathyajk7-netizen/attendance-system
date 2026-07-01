export const successResponse = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

export const paginatedResponse = (res, data, total, page, limit, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
  total,
  page: Number(page),
  limit: Number(limit),
  totalPages:
    Number(limit) > 0
      ? Math.ceil(total / Number(limit))
      : 0,
  hasNext: Number(page) * Number(limit) < total,
  hasPrev: Number(page) > 1,
},
    timestamp: new Date().toISOString(),
  });
};
