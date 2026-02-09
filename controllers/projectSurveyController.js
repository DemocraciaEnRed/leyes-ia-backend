import model from '../models/index.js';
import * as projectHelper from '../helpers/projectHelper.js'
import geminiService from '../services/gemini.js';
import { createUserContent, createPartFromUri } from '@google/genai'
import { z } from "zod";

export const generateBaseSurvey = async (req, res) => {
    const { projectId } = req.params;

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
            model: 'gemini-2.5-flash',
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
        console.error('Error generating default project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } 
}

export const generateProjectSurvey = async (req, res) => {
    const { projectId  } = req.params;
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
            model: 'gemini-2.5-flash',
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
        return res.status(200).json({ survey: { questions: generatedSurvey.questions, surveyJsonSchema } });
    } catch (error) {
        console.error('Error generating project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } 
}

// Regenerate Project Survey
// Main idea of calling this endpoint is to allow user to provide feedback to the previous generated survey
// and request a new version based on that feedback.
export const regenerateProjectSurvey = async (req, res) => {
    const { projectId } = req.params
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
            model: 'gemini-2.5-flash',
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
        return res.status(200).json({ survey: { questions: regeneratedSurvey.questions, surveyJsonSchema } });
    } catch (error) {
        console.error('Error regenerating project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } 
}

export const getProjectSurveys = async (req, res) => {
    const { projectId } = req.params;
    try {
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

        return res.status(200).json({ surveys });
    } catch (error) {
        console.error('Error fetching project surveys:', error);
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
        const surveyInstance = await model.ProjectSurvey.findOne({
            where: { id: surveyId, projectId },
        });

        if (!surveyInstance) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        return res.status(200).json({ survey: surveyInstance });
    } catch (error) {
        console.error('Error fetching project survey by ID:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}