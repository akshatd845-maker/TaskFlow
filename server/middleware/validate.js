export const validate = (schema, { source = 'body' } = {}) => {
  return (req, res, next) => {
    const data = source === 'body' ? req.body : source === 'params' ? req.params : source === 'query' ? req.query : req[source];
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });

    if (error) {
      const details = error.details?.map((d) => ({ path: d.path, message: d.message })) || [];

      // Provide clearer message for invalid sort values (common for card listing)
      const sortInvalid = details.some((d) => {
        const pathStr = Array.isArray(d.path) ? d.path.join('.') : String(d.path || '');
        return pathStr.includes('sort') && String(d.message || '').toLowerCase().includes('invalid');
      });

      return res.status(400).json({
        success: false,
        message: sortInvalid ? 'Invalid sort value' : 'Validation failed',
        errors: details
      });
    }


    // Assign validated + stripped value back
    if (source === 'body') req.body = value;
    else if (source === 'params') req.params = value;
    else if (source === 'query') req.query = value;

    next();
  };
};

