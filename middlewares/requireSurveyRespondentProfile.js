const REQUIRED_SURVEY_PROFILE_FIELDS = ['dateOfBirth', 'genre', 'documentNumber'];

export const getMissingSurveyProfileFields = (user) => {
  if (!user) {
    return [...REQUIRED_SURVEY_PROFILE_FIELDS];
  }

  return REQUIRED_SURVEY_PROFILE_FIELDS.filter((fieldName) => {
    return !user[fieldName];
  });
};

const requireSurveyRespondentProfile = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const missingFields = getMissingSurveyProfileFields(req.user);
  if (missingFields.length > 0) {
    return res.status(422).json({
      message: 'Debe completar su perfil antes de responder encuestas',
      missingFields,
    });
  }

  return next();
};

export default requireSurveyRespondentProfile;