import model from '../models/index.js';
import * as projectHelper from '../helpers/projectHelper.js'
import geminiService from '../services/gemini.js';
import { createUserContent, createPartFromUri } from '@google/genai'
import { z } from "zod";


export const generateProjectSurvey = async (req, res) => {
    const { projectId  } = req.params;
    const { userInstruction, objective, requiredQuestions } = req.body;

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
        // - options: array of strings (only for multiple-choice)
        // - required: boolean
        // - helpText: string (optional)
        // - maxLength: number (only for open-ended)
        // - scale: number (only for rating, e.g., 5 for a 1-5 scale)
        const surveyStructure = z.object({
            questions: z.array(z.object({
                questionText: z.string().describe('El texto de la pregunta a incluir en la encuesta. Nota: No siempre debe ser en formato de pregunta, puede ser una instrucción o una solicitud de feedback.'),
                type: z.enum(['multiple-choice', 'open-ended', 'rating']).describe('El tipo de pregunta: opción múltiple, abierta o de calificación.'),
                options: z.array(z.string()).optional().describe('Las opciones disponibles para preguntas de opción múltiple, si aplica.'),
                required: z.boolean().describe('Indica si la pregunta es obligatoria.'),
                helpText: z.string().optional().describe('Texto de ayuda adicional para la pregunta, si es necesario.'),
                maxLength: z.number().optional().describe('La longitud máxima permitida para respuestas abiertas, si aplica.'),
                scale: z.number().optional().describe('La escala de calificación para preguntas de calificación, si aplica.'),
            })).min(5).max(10) // limit to 20 questions
        });

        const surveyJsonSchema = surveyStructure.toJSONSchema();

        // Create Gemini User Content

        const prompt = `
            Eres un/a experto/a en diseño de encuestas.
            Basándote en el siguiente contenido del archivo del proyecto, crea una encuesta que esté alineada con los objetivos del proyecto.
            La encuesta debe incluir preguntas que recopilen de forma eficaz comentarios relevantes para las metas del proyecto.

            El usuario que solicita la encuesta ha proporcionado las siguientes instrucciones:
            <userInstruction>
            ${userInstruction}
            </userInstruction>
  
            El objetivo principal del proyecto es:
            <objective>
            ${objective}
            </objective>

            La encuesta debe incluir las siguientes preguntas específicas:
            <requiredQuestions>
            ${requiredQuestions.join('\n')}
            </requiredQuestions>

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
        return res.status(200).json({ survey: generatedSurvey });
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
    const { userEditRequest, originalSurvey } = req.body;

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
            Eres un/a experto/a en diseño de encuestas. En una interacción anterior, creaste la siguiente encuesta basada en el archivo del proyecto:
            <originalSurvey>
            ${JSON.stringify(originalSurvey, null, 2)}
            </originalSurvey>

            El usuario ha proporcionado los siguientes comentarios y solicitudes de edición:
            <userEditRequest>
            ${userEditRequest}
            </userEditRequest>

            Por favor, revisa la encuesta original para atender los comentarios del usuario y realizar las mejoras necesarias.
            Asegúrate de que la encuesta revisada siga alineada con los objetivos del proyecto y recopile de forma efectiva comentarios relevantes.
  
            Proporciona la encuesta actualizada en formato JSON cumpliendo con el mismo esquema que antes.
        `;

        console.log('Sending regeneration request to Gemini...');
        console.log('Using Gemini file URI:', geminiFileInstance.uri);

        const surveyStructure = z.object({
            questions: z.array(z.object({
                questionText: z.string().describe('El texto de la pregunta a incluir en la encuesta. Nota: No siempre debe ser en formato de pregunta, puede ser una instrucción o una solicitud de feedback.'),
                type: z.enum(['multiple-choice', 'open-ended', 'rating']).describe('El tipo de pregunta: opción múltiple, abierta o de calificación.'),
                options: z.array(z.string()).optional().describe('Las opciones disponibles para preguntas de opción múltiple, si aplica.'),
                required: z.boolean().describe('Indica si la pregunta es obligatoria.'),
                helpText: z.string().optional().describe('Texto de ayuda adicional para la pregunta, si es necesario.'),
                maxLength: z.number().optional().describe('La longitud máxima permitida para respuestas abiertas, si aplica.'),
                scale: z.number().optional().describe('La escala de calificación para preguntas de calificación, si aplica.'),
            })).min(5).max(10) // limit to 20 questions
        });

        const geminiResponse = await geminiService.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: createUserContent([
                createPartFromUri(geminiFileInstance.uri, geminiFileInstance.mimeType),
                prompt
            ]),
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: surveyStructure.toJSONSchema(),
            }
        })
        
        console.log('Gemini response:', geminiResponse);

        const regeneratedSurvey = JSON.parse(geminiResponse.text);

        console.log('Regenerated survey:', regeneratedSurvey);
        return res.status(200).json({ survey: regeneratedSurvey });
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
    const { survey } = req.body;

    try {
        const projectInstance = await model.Project.findByPk(projectId);
        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Here you would typically save the survey to the database.
        // For demonstration, we'll just log it.
        console.log(`Saving survey for project ID ${projectId}:`, survey);

        const surveyInstance = await model.ProjectSurvey.create({ projectId, surveyData: JSON.stringify(survey) });

        return res.status(200).json({ 
            message: 'Survey saved successfully',
            surveyInstance
        });
    } catch (error) {
        console.error('Error saving project survey:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}