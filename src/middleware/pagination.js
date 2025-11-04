export const pagination = (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    // Default limit is 25 to match MUI TablePagination options (10, 25, 50, 100)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;
  
    const sort = req.query.sort || '-createdAt';
    const sortFields = {};
    
    sort.split(',').forEach(field => {
      if (field.startsWith('-')) {
        sortFields[field.substring(1)] = -1;
      } else {
        sortFields[field] = 1;
      }
    });
  
    req.pagination = { page, limit, skip, sort: sortFields };
  
    res.paginate = (data, total) => {
      const totalPages = Math.ceil(total / limit);
      return {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    };
  
    next();
  };