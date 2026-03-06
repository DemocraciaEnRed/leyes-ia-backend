import { faker } from '@faker-js/faker';
import model from '../models/index.js';

const ALLOWED_ROLES = ['user', 'legislator', 'admin'];
const ALLOWED_GENRES = ['masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decir'];

const getNormalizedQuestionType = (questionType) => {
  if (typeof questionType !== 'string') {
    return 'open-ended';
  }

  const normalizedType = questionType.trim().toLowerCase();

  if (normalizedType === 'single-choice' || normalizedType === 'multiple-choice' || normalizedType === 'rating' || normalizedType === 'open-ended') {
    return normalizedType;
  }

  if (normalizedType === 'texto') {
    return 'open-ended';
  }

  return 'open-ended';
};

const ensureSurveyQuestionSchema = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return {
      valid: false,
      error: 'Survey has no questions to generate answers',
    };
  }

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const questionType = getNormalizedQuestionType(question?.type);

    if (questionType === 'single-choice' || questionType === 'multiple-choice') {
      const options = Array.isArray(question?.options)
        ? question.options.filter((option) => typeof option === 'string' && option.trim().length > 0)
        : [];

      if (options.length === 0) {
        return {
          valid: false,
          error: `Question ${index} requires at least one option`,
        };
      }
    }
  }

  return { valid: true };
};

const generateAnswerForQuestion = (question, questionIndex) => {
  const questionType = getNormalizedQuestionType(question?.type);
  const options = Array.isArray(question?.options)
    ? question.options.filter((option) => typeof option === 'string' && option.trim().length > 0)
    : [];

  if (questionType === 'single-choice') {
    return {
      questionIndex,
      value: faker.helpers.arrayElement(options),
    };
  }

  if (questionType === 'multiple-choice') {
    const optionCount = faker.number.int({ min: 1, max: options.length });
    return {
      questionIndex,
      value: faker.helpers.arrayElements(options, optionCount),
    };
  }

  if (questionType === 'rating') {
    const scale = Number.isInteger(Number(question?.scale)) && Number(question.scale) > 1
      ? Number(question.scale)
      : 5;

    return {
      questionIndex,
      value: faker.number.int({ min: 1, max: scale }),
    };
  }

  return {
    questionIndex,
    value: faker.lorem.sentence(),
  };
};

export const createDemoUser = async (req, res) => {
  const {
    email,
    firstName,
    lastName,
    password,
    role,
  } = req.body;

  try {
    const existingUser = await model.User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        message: 'El email ya se encuentra registrado',
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'El rol no es válido',
      });
    }

    const now = new Date();

    const userInstance = await model.User.create({
      email,
      firstName,
      lastName,
      password,
      role,
      emailVerified: true,
      verifiedAt: now,
    });

    return res.status(201).json({
      message: 'Demo user created successfully',
      user: userInstance.getUserSessionInfo(),
    });
  } catch (error) {
    console.error('Error creating demo user:', error);
    return res.status(500).json({
      message: 'Error al crear usuario demo',
    });
  }
};

export const generateSurveyResponses = async (req, res) => {
  const { projectId, surveyId } = req.params;
  const count = Number.parseInt(String(req.body?.count), 10);

  let transaction;

  try {
    const surveyInstance = await model.ProjectSurvey.findOne({
      where: {
        id: surveyId,
        projectId,
      },
      attributes: ['id', 'questions'],
    });

    if (!surveyInstance) {
      return res.status(404).json({
        message: 'Survey not found',
      });
    }

    const questions = Array.isArray(surveyInstance.questions) ? surveyInstance.questions : [];
    const schemaValidation = ensureSurveyQuestionSchema(questions);

    if (!schemaValidation.valid) {
      return res.status(400).json({
        message: schemaValidation.error,
      });
    }

    const provinceInstances = await model.Province.findAll({
      attributes: ['id'],
    });
    const provinceIds = provinceInstances.map((province) => province.id);

    if (provinceIds.length === 0) {
      return res.status(400).json({
        message: 'No hay provincias disponibles para generar respuestas demo',
      });
    }

    const records = [];

    for (let index = 0; index < count; index += 1) {
      const answers = questions.map((question, questionIndex) => generateAnswerForQuestion(question, questionIndex));

      records.push({
        projectSurveyId: surveyInstance.id,
        respondentData: {
          source: 'demo',
          generatedAt: new Date().toISOString(),
        },
        answers,
        age: faker.number.int({ min: 14, max: 85 }),
        genre: faker.helpers.arrayElement(ALLOWED_GENRES),
        provinceId: faker.helpers.arrayElement(provinceIds),
      });
    }

    transaction = await model.sequelize.transaction();

    await model.ProjectSurveyAnswer.bulkCreate(records, {
      transaction,
    });

    await model.ProjectSurvey.increment('responsesCount', {
      by: count,
      where: { id: surveyInstance.id },
      transaction,
    });

    await transaction.commit();

    return res.status(201).json({
      message: 'Demo survey responses generated successfully',
      generatedCount: count,
      surveyId: surveyInstance.id,
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    console.error('Error generating demo survey responses:', error);
    return res.status(500).json({
      message: 'Error generating demo survey responses',
    });
  }
};
