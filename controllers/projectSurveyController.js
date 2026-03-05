import model from '../models/index.js';
import * as projectHelper from '../helpers/projectHelper.js'
import geminiService from '../services/gemini.js';
import { createUserContent, createPartFromUri } from '@google/genai'
import { z } from "zod";
import { AI_USAGE_ACTIONS, recordProjectAiUsageEvent } from '../services/aiUsageAudit.js';

const { Op } = model.Sequelize;

const getPublicAvailableSurveyWhereClause = () => ({
    public: true,
    visible: true,
    [Op.or]: [
        { closedAt: null },
        { closedAt: { [Op.gt]: new Date() } }
    ]
});

const publicProjectWhereClause = (projectSlug) => ({
    slug: projectSlug,
    status: 'published',
    publishedAt: {
        [Op.ne]: null
    }
});

const mapPublicSurvey = (survey) => ({
    id: survey.id,
    projectId: survey.projectId,
    title: survey.title,
    about: survey.about,
    type: survey.type,
    welcomeTitle: survey.welcomeTitle,
    welcomeDescription: survey.welcomeDescription,
    responsesCount: survey.responsesCount,
    closedAt: survey.closedAt,
    createdAt: survey.createdAt,
    updatedAt: survey.updatedAt
});

const mapPublicSurveyDetail = (survey) => ({
    ...mapPublicSurvey(survey),
    allowAnonymousResponses: Boolean(survey.allowAnonymousResponses),
    questions: Array.isArray(survey.questions) ? survey.questions : [],
});

const isSurveyActive = (survey) => {
    if (!survey) {
        return false;
    }

    if (!survey.public || !survey.visible) {
        return false;
    }

    if (!survey.closedAt) {
        return true;
    }

    return new Date(survey.closedAt).getTime() > Date.now();
};

const ALLOWED_GENRES = ['masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decir'];
const REQUIRED_AUTH_SURVEY_PROFILE_FIELDS = ['dateOfBirth', 'genre', 'documentNumber', 'provinceId'];

const normalizeDateOfBirth = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
        return null;
    }

    const asDate = new Date(trimmedValue);
    if (Number.isNaN(asDate.getTime())) {
        return null;
    }

    return trimmedValue;
};

const normalizeGenre = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized || !ALLOWED_GENRES.includes(normalized)) {
        return null;
    }

    return normalized;
};

const normalizeDocumentNumber = (value) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return null;
    }

    const normalized = String(value).trim();
    if (!/^\d+$/.test(normalized)) {
        return null;
    }

    return normalized;
};

const normalizeProvinceId = async (value) => {
    if (typeof value !== 'number' && typeof value !== 'string') {
        return null;
    }

    const normalized = Number.parseInt(String(value), 10);
    if (!Number.isInteger(normalized) || normalized < 1) {
        return null;
    }

    const provinceInstance = await model.Province.findByPk(normalized, {
        attributes: ['id'],
    });

    if (!provinceInstance) {
        return null;
    }

    return normalized;
};

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

const normalizeAndValidateSurveyAnswers = (surveyQuestions, rawAnswers) => {
    if (!Array.isArray(surveyQuestions) || surveyQuestions.length === 0) {
        return {
            errors: [],
            normalizedAnswers: rawAnswers,
        };
    }

    if (!Array.isArray(rawAnswers)) {
        return {
            errors: [{ field: 'answers', message: 'Las respuestas de la encuesta tienen un formato inválido' }],
            normalizedAnswers: null,
        };
    }

    const errors = [];
    const normalizedAnswers = [];
    const answersByQuestionIndex = new Map();

    rawAnswers.forEach((rawItem, itemIndex) => {
        if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
            errors.push({ field: `answers.${itemIndex}`, message: 'El item de respuesta tiene un formato inválido' });
            return;
        }

        const questionIndex = Number.parseInt(String(rawItem.questionIndex), 10);
        if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= surveyQuestions.length) {
            errors.push({ field: `answers.${itemIndex}.questionIndex`, message: 'El índice de pregunta es inválido' });
            return;
        }

        if (answersByQuestionIndex.has(questionIndex)) {
            errors.push({ field: `answers.${itemIndex}.questionIndex`, message: 'La pregunta fue respondida más de una vez' });
            return;
        }

        answersByQuestionIndex.set(questionIndex, rawItem);
    });

    surveyQuestions.forEach((question, index) => {
        const rawAnswer = answersByQuestionIndex.get(index);
        const isRequired = Boolean(question?.required);
        const questionType = getNormalizedQuestionType(question?.type);
        const expectedOptions = Array.isArray(question?.options)
            ? question.options.filter((option) => typeof option === 'string' && option.trim().length > 0)
            : [];

        if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
            if (isRequired) {
                errors.push({ field: `answers.questionIndex.${index}`, message: 'La pregunta obligatoria no fue respondida' });
            }
            return;
        }

        const answerValue = (rawAnswer && typeof rawAnswer === 'object' && !Array.isArray(rawAnswer) && Object.prototype.hasOwnProperty.call(rawAnswer, 'value'))
            ? rawAnswer.value
            : rawAnswer;
        const answerOpenText = (rawAnswer && typeof rawAnswer === 'object' && !Array.isArray(rawAnswer) && typeof rawAnswer.openText === 'string')
            ? rawAnswer.openText.trim()
            : undefined;

        if (questionType === 'single-choice') {
            if (typeof answerValue !== 'string' || !answerValue.trim()) {
                errors.push({ field: `answers.questionIndex.${index}`, message: 'La respuesta debe ser una opción válida' });
                return;
            }

            if (expectedOptions.length > 0 && !expectedOptions.includes(answerValue)) {
                errors.push({ field: `answers.questionIndex.${index}`, message: 'La opción seleccionada no es válida para esta pregunta' });
                return;
            }

            normalizedAnswers.push({
                questionIndex: index,
                value: answerValue,
                ...(answerOpenText ? { openText: answerOpenText } : {}),
            });
            return;
        }

        if (questionType === 'multiple-choice') {
            if (!Array.isArray(answerValue)) {
                errors.push({ field: `answers.questionIndex.${index}`, message: 'La respuesta debe incluir una lista de opciones' });
                return;
            }

            const normalizedValues = answerValue
                .filter((value) => typeof value === 'string' && value.trim().length > 0)
                .map((value) => value.trim());

            if (isRequired && normalizedValues.length === 0) {
                errors.push({ field: `answers.questionIndex.${index}`, message: 'Debe seleccionar al menos una opción' });
                return;
            }

            if (expectedOptions.length > 0 && normalizedValues.some((value) => !expectedOptions.includes(value))) {
                errors.push({ field: `answers.questionIndex.${index}`, message: 'Una o más opciones seleccionadas no son válidas' });
                return;
            }

            normalizedAnswers.push({
                questionIndex: index,
                value: normalizedValues,
                ...(answerOpenText ? { openText: answerOpenText } : {}),
            });
            return;
        }

        if (questionType === 'rating') {
            const parsedValue = Number.parseInt(String(answerValue), 10);
            const maxScale = Number.isInteger(Number(question?.scale)) && Number(question.scale) > 1
                ? Number(question.scale)
                : 5;

            if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > maxScale) {
                errors.push({ field: `answers.questionIndex.${index}`, message: `La calificación debe estar entre 1 y ${maxScale}` });
                return;
            }

            normalizedAnswers.push({
                questionIndex: index,
                value: parsedValue,
                ...(answerOpenText ? { openText: answerOpenText } : {}),
            });
            return;
        }

        if (typeof answerValue !== 'string' || !answerValue.trim()) {
            errors.push({ field: `answers.questionIndex.${index}`, message: 'La respuesta de texto no es válida' });
            return;
        }

        normalizedAnswers.push({
            questionIndex: index,
            value: answerValue.trim(),
        });
    });

    normalizedAnswers.sort((a, b) => a.questionIndex - b.questionIndex);

    return {
        errors,
        normalizedAnswers,
    };
};

export const generateBaseSurvey = async (req, res) => {
    const { projectId } = req.params;
    const startedAt = Date.now();
    const geminiModel = 'gemini-2.5-flash';

    try {
        const projectInstance = await model.Project.findByPk(projectId);
        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const geminiFileInstance = await projectHelper.fetchOrUploadFileToGemini(projectId);
        
        // Wait for the file to be active in Gemini
        console.log('Waiting for Gemini file to be active:', geminiFileInstance.name);
        await geminiService.waitForFileActive(geminiFileInstance.name);
        console.log('Gemini file is active:', geminiFileInstance.name);

        const prompt = `
        
        ## Rol
        Eres un especialista en participación ciudadana y deliberación democrática.
        Basandote en en contenido de un proyecto de ley o política pública

        ## Objetivo
        El cuestionario debe servir para facilitar deliberación pública estructurada, 
        captar acuerdos colectivos y tensiones sociales, y producir insumos útiles para la toma de decisiones públicas.
        Presentá el cuestionario numerado, limpio y listo para usar.

        ## Instrucciones para la creación de las preguntas sustantivas

        - Debes formular 10 preguntas sobre el tema del proyecto.
        - Cada pregunta debe poder responderse sin haber leído el proyecto completo.
        - Las preguntas deben estar redactadas en lenguaje claro y cotidiano, evitando tecnicismos legales.
        - Enfocate en impactos concretos, valores generales y consecuencias prácticas.
        - Orientá las preguntas a detectar consenso y disenso.
        - Incluí de forma sutil elementos de perfil cívico (por ejemplo: rol del Estado, prevención vs castigo, preocupación por impactos sociales), sin preguntar ideología, partido o voto.
        - Cada pregunta debe usar este formato de respuesta: Sí / No / No sé + campo de texto libre opcional.
        - Las preguntas deben cubrir, al menos, estos ejes:
          * importancia del tema,
          * nivel de acuerdo con sanciones o medidas,
          * impacto en la vida cotidiana,
          * rol del Estado,
          * prevención vs castigo,
          * posibles efectos no deseados,
          * reparación o mejora.
        - No incluyas preguntas del tipo:
          * “¿Estás de acuerdo con el proyecto en general?”
          * Ni referencias a artículos legales específicos.
        
        Proporciona la encuesta en formato JSON cumpliendo con el esquema especificado.
        `

        // Survey Schema
        const surveyStructure = z.object({
            title: z.string().describe('Título de la encuesta. Es para uso interno, no es visible para los encuestados.'),
            about: z.string().describe('Descripción interna de la encuesta, para uso del equipo, no es visible para los encuestados.'),
            targetAudience: z.string().describe('Descripción de la audiencia objetivo de la encuesta, para uso interno.'),
            welcomeTitle: z.string().describe('Título de bienvenida para los encuestados, que se muestra al inicio de la encuesta.'),
            welcomeSubtitle: z.string().describe('Descripción de bienvenida para los encuestados, que se muestra al inicio de la encuesta.'),
            questions: z.array(z.object({
                questionText: z.string().describe('El texto de la pregunta a incluir en la encuesta.'),
                type: z.string().default('single-choice').describe('Tipo de pregunta (siempre single-choice para este formato).'),
                options: z.array(z.string()).default(['Sí', 'No', 'No sé']).describe('Las opciones de respuesta disponibles.'),
                required: z.boolean().describe('Indica si la pregunta es obligatoria.'),
                openTextEnabled: z.boolean().default(true).describe('Indica si se permite texto libre adicional después de la respuesta.'),
                helpText: z.string().optional().describe('Texto de ayuda adicional para la pregunta. Utilizar para aclarar conceptos o explicar elementos que la pregunta involucra de una forma simple quitando tecnicismos.')
            })).min(10).max(10) // exactly 10 questions as specified in the prompt
        });

        const surveyJsonSchema = surveyStructure.toJSONSchema();
        
        const geminiResponse = await geminiService.ai.models.generateContent({
            model: geminiModel,
            contents: createUserContent([
                createPartFromUri(geminiFileInstance.uri, geminiFileInstance.mimeType),
                prompt
            ]),
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: surveyJsonSchema,
            }
        })
        
        console.log('Gemini response:', geminiResponse);

        const generatedSurvey = JSON.parse(geminiResponse.text);

        console.log('Generated fields:', generatedSurvey);

        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.SURVEY_GENERATE_BASE,
            model: geminiModel,
            status: 'success',
            geminiResponse,
            latencyMs: Date.now() - startedAt,
            metadata: {
                route: req.originalUrl,
            },
        });

        return res.status(200).json({  
            survey: { 
                title: generatedSurvey.title, 
                about: generatedSurvey.about,
                targetAudience: generatedSurvey.targetAudience,
                welcomeTitle: generatedSurvey.welcomeTitle,
                welcomeSubtitle: generatedSurvey.welcomeSubtitle,
                questions: generatedSurvey.questions, 
                surveyJsonSchema
            } });
    } catch (error) {
        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.SURVEY_GENERATE_BASE,
            model: geminiModel,
            status: 'error',
            latencyMs: Date.now() - startedAt,
            errorMessage: error?.message || 'Unknown error',
            metadata: {
                route: req.originalUrl,
            },
        });
        console.error('Error generating default project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } 
}

export const generateProjectSurvey = async (req, res) => {
    const { projectId  } = req.params;
    const startedAt = Date.now();
    const geminiModel = 'gemini-2.5-flash';
    const { 
        surveyTargetAudience,
        surveyObjective,
        surveyContext,
        surveyQuestionCount,
        surveyUserInstructions,
        surveyRequiredQuestions,
     } = req.body;

    try {
        const projectInstance = await model.Project.findByPk(projectId);
        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const geminiFileInstance = await projectHelper.fetchOrUploadFileToGemini(projectId);


        // Wait for the file to be active in Gemini
        console.log('Waiting for Gemini file to be active:', geminiFileInstance.name);
        await geminiService.waitForFileActive(geminiFileInstance.name);
        console.log('Gemini file is active:', geminiFileInstance.name);

        // Survey Schema
        // Each question should have:
        // - questionText: string
        // - type: enum (multiple-choice, open-ended, rating)
        // - options: array of strings (only for multiple-choice or single-choice)
        // - required: boolean
        // - helpText: string (optional)
        // - openTextEnabled: boolean
        // - maxLength: number (only for open-ended)
        // - scale: number (only for rating, e.g., 5 for a 1-5 scale)
        // Also the total number of questions should be limited to questionCount (default 12)
        const surveyStructure = z.object({
            questions: z.array(z.object({
                questionText: z.string().describe('El texto de la pregunta a incluir en la encuesta. Nota: No siempre debe ser en formato de pregunta, puede ser una instrucción o una solicitud de feedback.'),
                type: z.enum(['multiple-choice', 'open-ended', 'rating', 'single-choice']).describe('El tipo de pregunta: opción múltiple, abierta, calificación o opcion simple.'),
                options: z.array(z.string()).optional().describe('Las opciones disponibles para preguntas de opción múltiple o simple, si aplica.'),
                required: z.boolean().describe('Indica si la pregunta es obligatoria.'),
                helpText: z.string().optional().describe('Texto de ayuda adicional para la pregunta. Utilizar para aclarar conceptos o explicar elementos que la pregunta involucra de una forma simple quitando tecnicismos. O utilizarlo asumiendo que el usuario haya leido el proyecto de ley completo. Explayate todo lo que sea necesario. Incluir referencias y explicaciones, no asumas que el usuario conoce términos técnicos o va a ir a buscar de que se trata lo que le estas referenciando, en todo caso debes explicarlo de forma resumida.'),
                openTextEnabled: z.boolean().describe('Indica si se permite texto libre adicional después de la respuesta.'),
                maxLength: z.number().optional().describe('La longitud máxima permitida para respuestas abiertas, si aplica.'),
                scale: z.number().optional().describe('La escala de calificación para preguntas de calificación, si aplica.'),
            })).min(5).max(surveyQuestionCount || 12), // limit to questionCount questions
        });

        const surveyJsonSchema = surveyStructure.toJSONSchema();

        // Create Gemini User Content

        const prompt = `
            Eres un/a experto/a en diseño de encuestas.

            Basándote en el contenido del archivo del proyecto de ley o política pública, crea una encuesta destinada a recopilar opiniones ciudadanas relevantes sobre el tema del proyecto.
            Idealmente la encuesta (salvo indicación en contrario) debe tratar de apuntar a ciudadanos que no han leído el proyecto completo, por lo que las preguntas deben estar formuladas en lenguaje claro y cotidiano, evitando tecnicismos legales.
            La intencion base seria recopilar opiniones y percepciones de ciudadanos comunes sobre el tema del proyecto, sus posibles impactos, consecuencias prácticas y valores en juego.
            
            -------------
            
            ## Detalles específicos para la creación de la encuesta
            
            Los siguientes detalles son provistos por el usuario y **ES IMPRESCINDIBLE** que los tengas en cuenta al crear la encuesta:
            
            La encuesta **DEBE** tener ${surveyQuestionCount || 12} preguntas en total.

            Contexto adicional relevante para la creación de la encuesta:
            <context>
            ${surveyContext || ''}
            </context>

            La encuesta está dirigida a la siguiente audiencia:
            <targetAudience>
            ${surveyTargetAudience || ''}
            </targetAudience>

            Instrucciones específicas proporcionadas por el usuario para guiar la creación de la encuesta:
            <userInstruction>
            ${surveyUserInstructions || ''}
            </userInstruction>
  
            El objetivo principal de la encuesta es:
            <objective>
            ${surveyObjective || ''}
            </objective>

            La encuesta debe incluir las siguientes preguntas específicas:
            <requiredQuestions>
            ${surveyRequiredQuestions.join('\n')}
            </requiredQuestions>

            -------------

            Usa tu mejor criterio para diseñar preguntas adicionales que complementen las solicitadas y mejoren la efectividad de la encuesta.
            Asegúrate de que las preguntas sean claras, imparciales y estén estructuradas para facilitar el análisis de las respuestas.

            Proporciona la encuesta en formato JSON cumpliendo con el esquema especificado.
        `;

        console.log('Sending generation request to Gemini...');
        console.log('Using Gemini file URI:', geminiFileInstance.uri);

        const geminiResponse = await geminiService.ai.models.generateContent({
            model: geminiModel,
            contents: createUserContent([
                createPartFromUri(geminiFileInstance.uri, geminiFileInstance.mimeType),
                prompt
            ]),
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: surveyJsonSchema,
            }
        })
        
        console.log('Gemini response:', geminiResponse);

        const generatedSurvey = JSON.parse(geminiResponse.text);

        console.log('Generated fields:', generatedSurvey);

        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.SURVEY_GENERATE,
            model: geminiModel,
            status: 'success',
            geminiResponse,
            latencyMs: Date.now() - startedAt,
            metadata: {
                route: req.originalUrl,
                questionCount: surveyQuestionCount || 12,
            },
        });

        return res.status(200).json({ survey: { questions: generatedSurvey.questions, surveyJsonSchema } });
    } catch (error) {
        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.SURVEY_GENERATE,
            model: geminiModel,
            status: 'error',
            latencyMs: Date.now() - startedAt,
            errorMessage: error?.message || 'Unknown error',
            metadata: {
                route: req.originalUrl,
                questionCount: surveyQuestionCount || 12,
            },
        });
        console.error('Error generating project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } 
}

// Regenerate Project Survey
// Main idea of calling this endpoint is to allow user to provide feedback to the previous generated survey
// and request a new version based on that feedback.
export const regenerateProjectSurvey = async (req, res) => {
    const { projectId } = req.params
    const startedAt = Date.now();
    const geminiModel = 'gemini-2.5-flash';
    const { 
        userPromptForEdits, 
        originalSurvey, 
        // Parámetros originales de generación (para mantener coherencia)
        surveyTargetAudience,
        surveyObjective,
        surveyContext,
        surveyQuestionCount,
        surveyUserInstructions,
        surveyRequiredQuestions,
    } = req.body;

    const questionCount = surveyQuestionCount || 12;

    try {
        const projectInstance = await model.Project.findByPk(projectId);
        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const geminiFileInstance = await projectHelper.fetchOrUploadFileToGemini(projectId);

        // Wait for the file to be active in Gemini
        console.log('Waiting for Gemini file to be active:', geminiFileInstance.name);
        await geminiService.waitForFileActive(geminiFileInstance.name);
        console.log('Gemini file is active:', geminiFileInstance.name);

        const prompt = `
            Eres un/a experto/a en diseño de encuestas.

            Se te proporciona:
            1. El archivo del proyecto de ley o política pública (adjunto)
            2. Los criterios originales con los que se diseñó la encuesta
            3. La encuesta previamente generada
            4. Comentarios y solicitudes de edición del usuario

            -------------

            ## Criterios originales de la encuesta

            Estos son los criterios con los que se generó la encuesta original. **Deben mantenerse a menos que el usuario explícitamente pida cambiarlos.**

            Audiencia objetivo:
            <targetAudience>
            ${surveyTargetAudience || 'Ciudadanos comunes que no han leído el proyecto completo.'}
            </targetAudience>

            Objetivo de la encuesta:
            <objective>
            ${surveyObjective || 'Recopilar opiniones y percepciones sobre el tema del proyecto, sus posibles impactos, consecuencias prácticas y valores en juego.'}
            </objective>

            Contexto adicional:
            <context>
            ${surveyContext || 'Sin contexto adicional especificado.'}
            </context>

            Instrucciones específicas del usuario:
            <originalInstructions>
            ${surveyUserInstructions || 'Sin instrucciones adicionales.'}
            </originalInstructions>

            Preguntas que deben incluirse obligatoriamente:
            <requiredQuestions>
            ${surveyRequiredQuestions?.length ? surveyRequiredQuestions.join('\n') : 'Sin preguntas obligatorias especificadas.'}
            </requiredQuestions>

            -------------

            ## Encuesta original generada
            <originalSurvey>
            ${JSON.stringify(originalSurvey, null, 2)}
            </originalSurvey>

            -------------

            ## Solicitudes de edición del usuario
            <userEditRequest>
            ${userPromptForEdits}
            </userEditRequest>

            -------------

            ## Tu tarea

            Revisa y modifica la encuesta original según las solicitudes del usuario.

            **Prioridades (en orden):**
            1. Aplicar las ediciones solicitadas por el usuario
            2. Mantener las preguntas obligatorias (requiredQuestions) a menos que el usuario pida quitarlas
            3. Respetar la audiencia objetivo y el tono apropiado para ella
            4. Mantener coherencia con el objetivo original de la encuesta

            **Restricciones:**
            - La encuesta debe tener exactamente ${questionCount} preguntas en total.
            - Usa el contenido del archivo del proyecto como referencia para validar precisión.

            **Guías para aplicar las ediciones:**
            - Aplica las solicitudes del usuario de forma literal cuando sean claras.
            - Si una solicitud es ambigua, interpreta la intención más razonable.
            - Si una solicitud contradice buenas prácticas de encuestas, aplica la esencia mejorando la redacción.
            - Mantén la coherencia general aunque modifiques preguntas individuales.

            Proporciona la encuesta actualizada en formato JSON cumpliendo con el esquema especificado.
        `;

        console.log('Sending regeneration request to Gemini...');
        console.log('Using Gemini file URI:', geminiFileInstance.uri);

        const surveyStructure = z.object({
            questions: z.array(z.object({
                questionText: z.string().describe('El texto de la pregunta a incluir en la encuesta. Nota: No siempre debe ser en formato de pregunta, puede ser una instrucción o una solicitud de feedback.'),
                type: z.enum(['multiple-choice', 'open-ended', 'rating', 'single-choice']).describe('El tipo de pregunta: opción múltiple, abierta, calificación o opcion simple.'),
                options: z.array(z.string()).optional().describe('Las opciones disponibles para preguntas de opción múltiple o simple, si aplica.'),
                required: z.boolean().describe('Indica si la pregunta es obligatoria.'),
                helpText: z.string().optional().describe('Texto de ayuda adicional para la pregunta. Utilizar para aclarar conceptos o explicar elementos que la pregunta involucra de una forma simple quitando tecnicismos. O utilizarlo asumiendo que el usuario haya leido el proyecto de ley completo. Explayate todo lo que sea necesario. Incluir referencias y explicaciones, no asumas que el usuario conoce términos técnicos o va a ir a buscar de que se trata lo que le estas referenciando, en todo caso debes explicarlo de forma resumida.'),
                openTextEnabled: z.boolean().describe('Indica si se permite texto libre adicional después de la respuesta.'),
                maxLength: z.number().optional().describe('La longitud máxima permitida para respuestas abiertas, si aplica.'),
                scale: z.number().optional().describe('La escala de calificación para preguntas de calificación, si aplica.'),
            })).min(5).max(questionCount), // limit to questionCount questions
        });

        const surveyJsonSchema = surveyStructure.toJSONSchema();

        const geminiResponse = await geminiService.ai.models.generateContent({
            model: geminiModel,
            contents: createUserContent([
                createPartFromUri(geminiFileInstance.uri, geminiFileInstance.mimeType),
                prompt
            ]),
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: surveyJsonSchema,
            }
        })
        
        console.log('Gemini response:', geminiResponse);

        const regeneratedSurvey = JSON.parse(geminiResponse.text);

        console.log('Regenerated survey:', regeneratedSurvey);

        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.SURVEY_REGENERATE,
            model: geminiModel,
            status: 'success',
            geminiResponse,
            latencyMs: Date.now() - startedAt,
            metadata: {
                route: req.originalUrl,
                questionCount,
            },
        });

        return res.status(200).json({ survey: { questions: regeneratedSurvey.questions, surveyJsonSchema } });
    } catch (error) {
        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.SURVEY_REGENERATE,
            model: geminiModel,
            status: 'error',
            latencyMs: Date.now() - startedAt,
            errorMessage: error?.message || 'Unknown error',
            metadata: {
                route: req.originalUrl,
                questionCount,
            },
        });
        console.error('Error regenerating project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } 
}

export const getProjectSurveys = async (req, res) => {
    const { projectId } = req.params;
    try {
        const projectInstance = await model.Project.findByPk(projectId, {
            attributes: ['id', 'featuredSurveyId']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // gets all the surveys for the project
        const surveys = await model.ProjectSurvey.findAll({
            where: { projectId },
            include: [
                {
                    model: model.ProjectSurveyAnswer,
                    as: 'projectSurveyAnswers'
                }
            ]
        });

        const mappedSurveys = surveys.map((surveyInstance) => ({
            ...surveyInstance.toJSON(),
            isFeatured: projectInstance.featuredSurveyId === surveyInstance.id,
            canEdit: !isSurveyActive(surveyInstance)
        }));

        return res.status(200).json({
            surveys: mappedSurveys,
            featuredSurveyId: projectInstance.featuredSurveyId
        });
    } catch (error) {
        console.error('Error fetching project surveys:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const updateProjectSurvey = async (req, res) => {
    const { projectId, surveyId } = req.params;
    const {
        surveyTitle,
        surveyAbout,
        surveyType,
        surveyPublic,
        surveyVisible,
        allowAnonymousResponses,
        surveyWelcomeTitle,
        surveyWelcomeSubtitle,
        surveyClosedAt,
        questions,
        surveyJsonSchema,
        surveyObjective,
        surveyTargetAudience,
        surveyContext,
        surveyUserInstructions,
        surveyRequiredQuestions
    } = req.body;

    try {
        const projectInstance = await model.Project.findByPk(projectId, {
            attributes: ['id']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const surveyInstance = await model.ProjectSurvey.findOne({
            where: { id: surveyId, projectId }
        });

        if (!surveyInstance) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        if (isSurveyActive(surveyInstance)) {
            return res.status(409).json({
                error: 'This survey is active and cannot be edited'
            });
        }

        if (surveyTitle !== undefined) {
            surveyInstance.title = surveyTitle || 'Encuesta sin título';
        }
        if (surveyAbout !== undefined) {
            surveyInstance.about = surveyAbout || null;
        }
        if (surveyType !== undefined) {
            surveyInstance.type = surveyType || surveyInstance.type;
        }
        if (surveyPublic !== undefined) {
            surveyInstance.public = surveyPublic;
        }
        if (surveyVisible !== undefined) {
            surveyInstance.visible = surveyVisible;
        }
        if (allowAnonymousResponses !== undefined) {
            surveyInstance.allowAnonymousResponses = allowAnonymousResponses;
        }
        if (surveyWelcomeTitle !== undefined) {
            surveyInstance.welcomeTitle = surveyWelcomeTitle || 'Bienvenido a la encuesta';
        }
        if (surveyWelcomeSubtitle !== undefined) {
            surveyInstance.welcomeDescription = surveyWelcomeSubtitle || null;
        }
        if (surveyClosedAt !== undefined) {
            surveyInstance.closedAt = surveyClosedAt || null;
        }
        if (questions !== undefined) {
            surveyInstance.questions = questions || [];
        }
        if (surveyJsonSchema !== undefined) {
            surveyInstance.surveyJsonSchema = surveyJsonSchema || null;
        }
        if (surveyObjective !== undefined) {
            surveyInstance.objective = surveyObjective || null;
        }
        if (surveyTargetAudience !== undefined) {
            surveyInstance.targetAudience = surveyTargetAudience || null;
        }
        if (surveyContext !== undefined) {
            surveyInstance.context = surveyContext || null;
        }
        if (surveyUserInstructions !== undefined) {
            surveyInstance.userInstructions = surveyUserInstructions || null;
        }
        if (surveyRequiredQuestions !== undefined) {
            surveyInstance.requiredQuestions = surveyRequiredQuestions || null;
        }

        await surveyInstance.save();

        return res.status(200).json({
            message: 'Survey updated successfully',
            survey: {
                ...surveyInstance.toJSON(),
                canEdit: !isSurveyActive(surveyInstance)
            }
        });
    } catch (error) {
        console.error('Error updating project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const saveProjectSurvey = async (req, res) => {
    const { projectId } = req.params;
    console.log('Request user:', req.user);
    const user = req.user;
    const { 
        surveyTitle,
        surveyAbout,
        surveyType,
        surveyPublic,
        surveyVisible,
        allowAnonymousResponses,
        surveyWelcomeTitle,
        surveyWelcomeSubtitle,
        // Parámetros originales de generación (para mantener coherencia)
        questions,
        surveyJsonSchema,
        surveyObjective,
        surveyTargetAudience,
        surveyContext,
        surveyUserInstructions,
        surveyRequiredQuestions,
        surveyClosedAt
     } = req.body;

    try {
        const projectInstance = await model.Project.findByPk(projectId);
        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }    

        const surveyInstance = await model.ProjectSurvey.create({
            projectId: projectInstance.id,
            createdByUserId: user.id,
            title: surveyTitle || 'Encuesta sin título',
            about: surveyAbout || null,
            type: surveyType || 'custom',
            public: surveyPublic !== undefined ? surveyPublic : true,
            visible: surveyVisible !== undefined ? surveyVisible : true,
            welcomeTitle: surveyWelcomeTitle || 'Bienvenido a la encuesta',
            welcomeDescription: surveyWelcomeSubtitle || null,
            allowAnonymousResponses: allowAnonymousResponses !== undefined ? allowAnonymousResponses : false,
            objective: surveyObjective || null,
            targetAudience: surveyTargetAudience || null,
            context: surveyContext || null,
            userInstructions: surveyUserInstructions || null,
            requiredQuestions: surveyRequiredQuestions || null,
            surveyJsonSchema: surveyJsonSchema || null,
            questions: questions || null,
            responsesCount: 0,
            closedAt: surveyClosedAt || null

         });

        return res.status(200).json({ 
            message: 'Survey saved successfully',
            surveyInstance
        });
    } catch (error) {
        console.error('Error saving project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


export const getProjectSurveyById = async (req, res) => {
    const { projectId, surveyId } = req.params;

    try {
        const projectInstance = await model.Project.findByPk(projectId, {
            attributes: ['id', 'featuredSurveyId']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const surveyInstance = await model.ProjectSurvey.findOne({
            where: { id: surveyId, projectId },
        });

        if (!surveyInstance) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        return res.status(200).json({
            survey: {
                ...surveyInstance.toJSON(),
                isFeatured: projectInstance.featuredSurveyId === surveyInstance.id,
                canEdit: !isSurveyActive(surveyInstance)
            },
            featuredSurveyId: projectInstance.featuredSurveyId
        });
    } catch (error) {
        console.error('Error fetching project survey by ID:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const setProjectFeaturedSurvey = async (req, res) => {
    const { projectId, surveyId } = req.params;

    try {
        const projectInstance = await model.Project.findByPk(projectId, {
            attributes: ['id', 'featuredSurveyId']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const surveyInstance = await model.ProjectSurvey.findOne({
            where: {
                id: surveyId,
                projectId,
                ...getPublicAvailableSurveyWhereClause()
            },
            attributes: ['id', 'title', 'projectId', 'public', 'visible', 'closedAt']
        });

        if (!surveyInstance) {
            return res.status(404).json({ error: 'Survey not found or unavailable to be featured' });
        }

        projectInstance.featuredSurveyId = surveyInstance.id;
        await projectInstance.save();

        return res.status(200).json({
            message: 'Featured survey updated successfully',
            featuredSurveyId: surveyInstance.id,
            survey: {
                ...surveyInstance.toJSON(),
                isFeatured: true
            }
        });
    } catch (error) {
        console.error('Error setting featured survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const clearProjectFeaturedSurvey = async (req, res) => {
    const { projectId } = req.params;

    try {
        const projectInstance = await model.Project.findByPk(projectId, {
            attributes: ['id', 'featuredSurveyId']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (!projectInstance.featuredSurveyId) {
            return res.status(200).json({
                message: 'Featured survey already cleared',
                featuredSurveyId: null
            });
        }

        projectInstance.featuredSurveyId = null;
        await projectInstance.save();

        return res.status(200).json({
            message: 'Featured survey cleared successfully',
            featuredSurveyId: null
        });
    } catch (error) {
        console.error('Error clearing featured survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const getPublicFeaturedSurveyByProjectSlug = async (req, res) => {
    const { projectSlug } = req.params;

    try {
        const projectInstance = await model.Project.findOne({
            where: publicProjectWhereClause(projectSlug),
            attributes: ['id', 'slug', 'featuredSurveyId']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (!projectInstance.featuredSurveyId) {
            return res.status(200).json({
                hasFeaturedSurvey: false,
                featuredSurvey: null
            });
        }

        const featuredSurvey = await model.ProjectSurvey.findOne({
            where: {
                id: projectInstance.featuredSurveyId,
                projectId: projectInstance.id,
                ...getPublicAvailableSurveyWhereClause()
            }
        });

        if (!featuredSurvey) {
            return res.status(200).json({
                hasFeaturedSurvey: false,
                featuredSurvey: null
            });
        }

        return res.status(200).json({
            hasFeaturedSurvey: true,
            featuredSurvey: mapPublicSurvey(featuredSurvey)
        });
    } catch (error) {
        console.error('Error fetching public featured survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const getPublicAvailableSurveysByProjectSlug = async (req, res) => {
    const { projectSlug } = req.params;

    try {
        const projectInstance = await model.Project.findOne({
            where: publicProjectWhereClause(projectSlug),
            attributes: ['id', 'slug', 'featuredSurveyId']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const surveys = await model.ProjectSurvey.findAll({
            where: {
                projectId: projectInstance.id,
                ...getPublicAvailableSurveyWhereClause()
            },
            order: [['createdAt', 'DESC']]
        });

        const availableSurveys = surveys.map((surveyInstance) => ({
            ...mapPublicSurvey(surveyInstance),
            isFeatured: projectInstance.featuredSurveyId === surveyInstance.id
        }));

        return res.status(200).json({
            surveys: availableSurveys,
            total: availableSurveys.length
        });
    } catch (error) {
        console.error('Error fetching public available surveys:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const getPublicSurveyByProjectSlugAndSurveyId = async (req, res) => {
    const { projectSlug, surveyId } = req.params;

    try {
        const projectInstance = await model.Project.findOne({
            where: publicProjectWhereClause(projectSlug),
            attributes: ['id', 'slug', 'featuredSurveyId']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const surveyInstance = await model.ProjectSurvey.findOne({
            where: {
                id: surveyId,
                projectId: projectInstance.id,
                ...getPublicAvailableSurveyWhereClause()
            },
            attributes: [
                'id',
                'projectId',
                'title',
                'about',
                'type',
                'welcomeTitle',
                'welcomeDescription',
                'allowAnonymousResponses',
                'questions',
                'responsesCount',
                'closedAt',
                'createdAt',
                'updatedAt',
            ]
        });

        if (!surveyInstance) {
            return res.status(404).json({
                code: 'SURVEY_UNAVAILABLE',
                message: 'Survey not found or unavailable',
            });
        }

        return res.status(200).json({
            survey: {
                ...mapPublicSurveyDetail(surveyInstance),
                isFeatured: projectInstance.featuredSurveyId === surveyInstance.id,
                respondentRequiredFields: REQUIRED_AUTH_SURVEY_PROFILE_FIELDS,
            },
        });
    } catch (error) {
        console.error('Error fetching public survey by slug and surveyId:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const getPublicSurveyRespondentEligibilityByProjectSlugAndSurveyId = async (req, res) => {
    const { projectSlug, surveyId } = req.params;

    try {
        const projectInstance = await model.Project.findOne({
            where: publicProjectWhereClause(projectSlug),
            attributes: ['id']
        });

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const surveyInstance = await model.ProjectSurvey.findOne({
            where: {
                id: surveyId,
                projectId: projectInstance.id,
                ...getPublicAvailableSurveyWhereClause()
            },
            attributes: ['id', 'projectId', 'allowAnonymousResponses']
        });

        if (!surveyInstance) {
            return res.status(404).json({ error: 'Survey not found or unavailable' });
        }

        if (req.user?.id) {
            const existingAnswer = await model.ProjectSurveyAnswer.findOne({
                where: {
                    projectSurveyId: surveyInstance.id,
                    userId: req.user.id,
                },
                attributes: ['id'],
            });

            if (existingAnswer) {
                return res.status(200).json({
                    projectId: surveyInstance.projectId,
                    surveyId: surveyInstance.id,
                    mode: 'authenticated',
                    eligible: false,
                    hasResponded: true,
                    code: 'ALREADY_RESPONDED',
                    allowAnonymousResponses: Boolean(surveyInstance.allowAnonymousResponses),
                    requiredFields: REQUIRED_AUTH_SURVEY_PROFILE_FIELDS,
                    missingFields: [],
                    message: 'Ya registraste una respuesta para esta encuesta',
                });
            }

            const missingFields = REQUIRED_AUTH_SURVEY_PROFILE_FIELDS.filter((fieldName) => !req.user[fieldName]);

            return res.status(200).json({
                projectId: surveyInstance.projectId,
                surveyId: surveyInstance.id,
                mode: 'authenticated',
                eligible: missingFields.length === 0,
                hasResponded: false,
                allowAnonymousResponses: Boolean(surveyInstance.allowAnonymousResponses),
                requiredFields: REQUIRED_AUTH_SURVEY_PROFILE_FIELDS,
                missingFields,
                message: missingFields.length > 0
                    ? 'Debe completar su perfil antes de responder encuestas'
                    : 'Perfil completo para responder encuestas',
            });
        }

        const canRespondAnonymously = Boolean(surveyInstance.allowAnonymousResponses);

        return res.status(200).json({
            projectId: surveyInstance.projectId,
            surveyId: surveyInstance.id,
            mode: 'anonymous',
            eligible: canRespondAnonymously,
            hasResponded: false,
            allowAnonymousResponses: canRespondAnonymously,
            requiredFields: REQUIRED_AUTH_SURVEY_PROFILE_FIELDS,
            missingFields: canRespondAnonymously ? [] : REQUIRED_AUTH_SURVEY_PROFILE_FIELDS,
            message: canRespondAnonymously
                ? 'Puede responder de forma anónima completando los datos requeridos'
                : 'Debe iniciar sesión para responder esta encuesta',
        });
    } catch (error) {
        console.error('Error checking public survey respondent eligibility:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const submitProjectSurveyResponse = async (req, res) => {
    const { projectId, surveyId } = req.params;
    const {
        answers,
        respondentData,
        dateOfBirth,
        genre,
        documentNumber,
        provinceId,
    } = req.body || {};

    let transaction;

    try {
        const surveyInstance = await model.ProjectSurvey.findOne({
            where: {
                id: surveyId,
                projectId,
                ...getPublicAvailableSurveyWhereClause(),
            },
            attributes: ['id', 'allowAnonymousResponses', 'questions'],
        });

        if (!surveyInstance) {
            return res.status(404).json({ error: 'Survey not found or unavailable' });
        }

        let responseUserId = null;
        let responseDateOfBirth = null;
        let responseGenre = null;
        let responseProvinceId = null;
        let responseDocumentNumber = null;

        if (req.user?.id) {
            const userInstance = await model.User.findByPk(req.user.id, {
                attributes: ['id', 'dateOfBirth', 'genre', 'documentNumber', 'provinceId'],
            });

            if (!userInstance) {
                return res.status(401).json({
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required',
                });
            }

            const missingFields = REQUIRED_AUTH_SURVEY_PROFILE_FIELDS.filter((fieldName) => !userInstance[fieldName]);
            if (missingFields.length > 0) {
                return res.status(422).json({
                    code: 'PROFILE_INCOMPLETE',
                    message: 'Debe completar su perfil antes de responder encuestas',
                    missingFields,
                });
            }

            responseUserId = userInstance.id;
            responseDateOfBirth = userInstance.dateOfBirth;
            responseGenre = userInstance.genre;
            responseProvinceId = userInstance.provinceId;
            responseDocumentNumber = userInstance.documentNumber;

            const existingAnswer = await model.ProjectSurveyAnswer.findOne({
                where: {
                    projectSurveyId: surveyInstance.id,
                    userId: responseUserId,
                },
                attributes: ['id'],
            });

            if (existingAnswer) {
                return res.status(409).json({
                    code: 'DUPLICATE_RESPONSE_USER',
                    message: 'Ya registraste una respuesta para esta encuesta',
                });
            }
        } else {
            if (!surveyInstance.allowAnonymousResponses) {
                return res.status(401).json({
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required',
                });
            }

            const normalizedDateOfBirth = normalizeDateOfBirth(dateOfBirth);
            const normalizedGenre = normalizeGenre(genre);
            const normalizedDocumentNumber = normalizeDocumentNumber(documentNumber);
            const normalizedProvinceId = await normalizeProvinceId(provinceId);
            const errors = [];

            if (!normalizedDateOfBirth) {
                errors.push({ field: 'dateOfBirth', message: 'La fecha de nacimiento debe tener formato YYYY-MM-DD' });
            }

            if (!normalizedGenre) {
                errors.push({ field: 'genre', message: `El campo genre debe ser uno de: ${ALLOWED_GENRES.join(', ')}` });
            }

            if (!normalizedDocumentNumber) {
                errors.push({ field: 'documentNumber', message: 'El número de documento debe contener solo dígitos' });
            }

            if (!normalizedProvinceId) {
                errors.push({ field: 'provinceId', message: 'La provincia seleccionada no es válida' });
            }

            if (errors.length > 0) {
                return res.status(400).json({
                    code: 'INVALID_RESPONDENT_DATA',
                    message: 'No se pudo registrar la respuesta de la encuesta',
                    errors,
                });
            }

            responseDateOfBirth = normalizedDateOfBirth;
            responseGenre = normalizedGenre;
            responseProvinceId = normalizedProvinceId;
            responseDocumentNumber = normalizedDocumentNumber;

            const existingAnonymousAnswer = await model.ProjectSurveyAnswer.findOne({
                where: {
                    projectSurveyId: surveyInstance.id,
                    userId: null,
                    documentNumber: responseDocumentNumber,
                },
                attributes: ['id'],
            });

            if (existingAnonymousAnswer) {
                return res.status(409).json({
                    code: 'DUPLICATE_RESPONSE_DOCUMENT',
                    message: 'Ya existe una respuesta registrada con ese número de documento para esta encuesta',
                });
            }
        }

        const { errors: answerValidationErrors, normalizedAnswers } = normalizeAndValidateSurveyAnswers(
            surveyInstance.questions,
            answers,
        );

        if (answerValidationErrors.length > 0) {
            return res.status(400).json({
                code: 'INVALID_ANSWERS',
                message: 'No se pudo registrar la respuesta de la encuesta',
                errors: answerValidationErrors,
            });
        }

        transaction = await model.sequelize.transaction();

        const answerInstance = await model.ProjectSurveyAnswer.create({
            projectSurveyId: surveyInstance.id,
            respondentData: req.user?.id
                ? (respondentData || null)
                : {
                    ...(respondentData && typeof respondentData === 'object' ? respondentData : {}),
                    documentNumber: responseDocumentNumber,
                },
            answers: normalizedAnswers,
            userId: responseUserId,
            dateOfBirth: responseDateOfBirth,
            genre: responseGenre,
            provinceId: responseProvinceId,
            documentNumber: responseDocumentNumber,
        }, {
            transaction,
        });

        await model.ProjectSurvey.increment('responsesCount', {
            by: 1,
            where: { id: surveyInstance.id },
            transaction,
        });

        await transaction.commit();

        return res.status(201).json({
            message: 'Survey response submitted successfully',
            responseId: answerInstance.id,
        });
    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }
        console.error('Error submitting survey response:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const getSurveyRespondentEligibility = async (req, res) => {
    const { projectId, surveyId } = req.params;

    try {
        const surveyInstance = await model.ProjectSurvey.findOne({
            where: { id: surveyId, projectId },
            attributes: ['id']
        });

        if (!surveyInstance) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        return res.status(200).json({
            eligible: true,
            missingFields: [],
            message: 'Perfil completo para responder encuestas'
        });
    } catch (error) {
        console.error('Error checking survey respondent eligibility:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}