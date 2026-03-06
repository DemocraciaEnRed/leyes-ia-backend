const getQueryValue = (value) => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
};

export default function demoMagicWord(req, res, next) {
  const expectedMagicWord = process.env.MAGIC_WORD;

  if (!expectedMagicWord) {
    return res.status(500).json({
      message: 'MAGIC_WORD is not configured',
    });
  }

  const providedMagicWord = getQueryValue(req.query?.MAGIC_WORD).trim();

  if (!providedMagicWord) {
    return res.status(401).json({
      message: 'MAGIC_WORD query param is required',
    });
  }

  if (providedMagicWord !== expectedMagicWord) {
    return res.status(403).json({
      message: 'Invalid MAGIC_WORD',
    });
  }

  return next();
}
