module.exports = {
    defaultTTL: Number(process.env.CACHE_DEFAULT_TTL) || 120,    
    queryTTL: Number(process.env.CACHE_QUERY_TTL) || 30,    
  };
  