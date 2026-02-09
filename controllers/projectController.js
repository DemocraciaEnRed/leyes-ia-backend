import s3Client from '../services/s3Client.js';
import fs from 'fs';
import model from '../models/index.js';
import * as projectHelper from '../helpers/projectHelper.js'
import { client as DigitalOceanGradientClient } from '../services/gradient.js';
import geminiService from '../services/gemini.js';
import { createUserContent, createPartFromUri } from '@google/genai'
import { z } from "zod";


export const getProjects = async (req, res) => {
    try {
        const { category, draft } = req.query;
        let whereClause = {};
        if (category) {
            // we only get the index
            const categorias = projectHelper.getCategorias();
            const namedCategory = categorias[parseInt(category)];
            whereClause.category = namedCategory;
        }
        if (draft === 'true') {
            whereClause.publishedAt = null;
        } else if (draft === 'false' || !draft) {
            whereClause.publishedAt = { [model.Sequelize.Op.ne]: null };
        }
        const projects = await model.Project.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
        return res.status(200).json({ projects });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await model.Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        return res.status(200).json({ project });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const getProjectCategories = async (req, res) => {
    try {
        const categories = projectHelper.getCategorias();
        return res.status(200).json({ categories });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

// Note: We are using Multer

export const createProject = async (req, res) => {
    try {
        // Implementation for creating a project.
        // It will recieve data and files.
        // One file is identified as the main pdf, the "proyecto de ley"
        // The other files are supporting documents, like annexes, related laws, etc.

        const { name, slug, title, description, authorFullname } = req.body;
        const projectPdf = req.file; // Multer puts the files here

        // TODO: To implement better validation as middleware.
        if (!name || !slug || !authorFullname || !projectPdf) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create a new project in the database
        let newProjectCode = await projectHelper.generateUniqueProjectCode(model);
        const projectPdfFilename = `${newProjectCode}-project.pdf`;
        const newProject = await model.Project.create({
            code: newProjectCode,
            name: name,
            status: 'created',
            title: title,
            slug: slug,
            description: description,
            filename: projectPdfFilename,
            authorFullname: authorFullname,
        });

        console.log('Code created:', newProjectCode);
        console.log('Created new project:', newProject);

        // Now we can upload the files to DigitalOcean Spaces
        const bucket = process.env.DIGITALOCEAN_SPACES_BUCKET
        const folder = `knowledge_bases/${newProjectCode}-files/knowledge_base`;

        console.log('Bucket to use:', bucket);
        console.log('Folder to use:', folder);

        const file = projectPdf; // Single file uploa
        let body;
        if (file.buffer) {
            body = file.buffer;
        } else if (file.path) {
            body = fs.createReadStream(file.path);
        } else if (file.stream) {
            body = file.stream;
        } else {
            throw new Error(`No usable file body for upload: ${file.originalname}`);
        }

        const params = {
            Bucket: bucket,
            Key: `${folder}/${projectPdfFilename}`,
            Body: body,
            ACL: 'public-read',
            ContentType: file.mimetype,
        };

        try {
            const result = await s3Client.uploadFile(params.Key, params.Body, params.ACL, params.ContentType);
            console.log('Uploaded file:', projectPdfFilename, '->', params.Key, 'result:', result);
            const newProjectFile = await model.ProjectFile.create({
                projectId: newProject.id,
                type: 'main_project_pdf',
                name: projectPdfFilename,
                path: params.Key,
                size: file.size,
                mimeType: file.mimetype,
                s3Bucket: bucket,
                s3Key: params.Key,
                url: result.Location || null,
            });
            console.log('Created ProjectFile instance:', newProjectFile);
        } catch (uploadErr) {
            console.error('Failed uploading', projectPdfFilename, 'to bucket', bucket);
            console.error('Upload error code:', uploadErr.Code || uploadErr.code);
            console.error('Upload error message:', uploadErr.message || uploadErr);
            console.error('Upload error metadata:', uploadErr.$metadata || {});
            throw uploadErr; // rethrow to be cxaught by outer try/catch
        }

        // Create the knowledge base in DigitalOcean Gradient
        const knowledgeBaseFolder = `${folder}`
        const knowledgeBaseCreateResponse = await DigitalOceanGradientClient.knowledgeBases.create({
            name: `${newProjectCode}-kb`,
            database_id: process.env.OPENSEARCH_DATABASE_ID,
            embedding_model_uuid: '22652f75-79ed-11ef-bf8f-4e013e2ddde4',
            project_id: process.env.DIGITALOCEAN_PROJECT_ID,
            datasources: [
                {
                    spaces_data_source: {
                        bucket_name: bucket,
                        item_path: knowledgeBaseFolder,
                        region: process.env.DIGITALOCEAN_SPACES_REGION,
                    }
                }
            ]
        })

        console.log('Created knowledge base:', knowledgeBaseCreateResponse);

        // Save the knowledge base info in our database
        const newKnowledgeBase = await model.KnowledgeBase.create({
            uuid: knowledgeBaseCreateResponse.knowledge_base.uuid,
            name: knowledgeBaseCreateResponse.knowledge_base.name,
            projectId: newProject.id,
            status: knowledgeBaseCreateResponse.knowledge_base.last_indexing_job ? knowledgeBaseCreateResponse.knowledge_base.last_indexing_job.status : 'INDEX_JOB_STATUS_UNKNOWN',
            lastAPIResponse: knowledgeBaseCreateResponse.knowledge_base,
            lastAPIResponseAt: new Date(),
        });

        return res.status(200).json({
            message: 'Project initialized successfully',
            project: {
                id: newProject.id,
                code: newProject.code,
                name: newProject.name,
                slug: newProject.slug,
                authorFullname: newProject.authorFullname
            },
            knowledgeBase: {
                uuid: newKnowledgeBase.uuid,
                name: newKnowledgeBase.name,
                status: newKnowledgeBase.status
            }
        });

    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const postGenerateProjectFields = async (req, res) => {
    // Implementation for generating project fields using AI.
    try {
        const { projectId } = req.params;
        const projectInstance = await model.Project.findByPk(projectId);

        if (!projectInstance) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Use Gemini to generate project fields based on the knowledge base

        //const path = (projectInstance.digitalOceanBucketFolder || '').replace(/^\//, '');
        //const pdfResp = await s3Client.downloadFile(mainFile.s3Key);

        const geminiFileInstance = await projectHelper.fetchOrUploadFileToGemini(projectId);

        // Wait for the file to be active in Gemini
        console.log('Waiting for Gemini file to be active:', geminiFileInstance.name);
        await geminiService.waitForFileActive(geminiFileInstance.name);
        console.log('Gemini file is active:', geminiFileInstance.name);

        // Preparing the prompt and schema for Gemini generation
        const lawProjectSchemJsonSchema = projectHelper.getProjectFieldsJsonSchema();

        const prompt = `
            Eres un experto en proyectos de ley de Argentina
            Se te proporcionará un proyecto de Ley y deberas completar el schema JSON solicitado a partir del contenido del proyecto de ley.
            
            Intenta que la información este para un nivel de compresión general, este será principalmente a ciudadanos en general sin conocimientos legales.
            
            IMPORTANTE:
            - No cambies de lenguaje las keys del JSON, deben ser exactamente las mismas.
            - Si no puedes encontrar la información en el proyecto de ley, devuelve una cadena vacía para ese campo.
            - Las preguntas que generes en "proposed_questions" deben ser simples y directas, enfocadas en ciudadanos comunes. Son preguntas que luego iran a un chat que detras trabajan agentes que tienen capacidades de RAG sobre el proyecto, o sobre conocimientos generales sobre el funcionamiento de el sistema legislativo argentino, o hasta puede buscar en Google (conocido como grounding)
        `

        // const prompt = `
        //     Eres un experto en extraer y redactar información de proyectos de ley de Argentina en base a una estructura JSON predefinida.
        //     Se te proporcionará un proyecto de Ley y deberas completar el schema JSON solicitado a partir del contenido del proyecto de ley.

        //     Sin embargo.. hay un plot twist: Vas a ser alguien "mala onda", que no le gusta nada de lo que ve y que siempre todo lo hace con un tono ironico, satirico, y un poco agresivo.

        //     Tu tarea es analizar el proyecto de ley proporcionado y generar un JSON con la siguiente estructura, asegurándote de que cada campo refleje tu perspectiva crítica y sarcástica:
        //     Intenta que la información este para un nivel de compresión general, este será principalmente a ciudadanos en general sin conocimientos legales.

        //     IMPORTANTE:
        //     - No cambies de lenguaje las keys del JSON, deben ser exactamente las mismas.
        //     - Si no puedes encontrar la información en el proyecto de ley, devuelve una cadena vacía para ese campo.
        //     - Las preguntas que generes en "proposed_questions" deben ser simples y directas, enfocadas en ciudadanos comunes. Son preguntas que luego iran a un chat que detras trabajan agentes que tienen capacidades de RAG sobre el proyecto, o sobre conocimientos generales sobre el funcionamiento de el sistema legislativo argentino, o hasta puede buscar en Google (conocido como grounding)
        // `

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
                responseJsonSchema: lawProjectSchemJsonSchema,
            }
        })

        console.log('Gemini response:', geminiResponse);

        const generatedFields = JSON.parse(geminiResponse.text);

        console.log('Generated fields:', generatedFields);

        return res.status(200).json({
            message: 'Project fields generated successfully', project: {
                id: projectInstance.id,
                title: generatedFields.title,
                description: generatedFields.description,
                summary: generatedFields.summary,
                category: generatedFields.category,
                content: generatedFields.content,
                proposed_questions: generatedFields.proposed_questions || []
            }
        });

    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const postRegenerateProjectFields = async (req, res) => {
    // Implementation for regenerating project fields using AI.
    try {
        const { projectId } = req.params
        const { userEditRequest, previousLawProjectFields } = req.body;
        const projectInstance = await model.Project.findByPk(projectId);

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const geminiFileInstance = await projectHelper.fetchOrUploadFileToGemini(projectId);

        // Wait for the file to be active in Gemini
        console.log('Waiting for Gemini file to be active:', geminiFileInstance.name);
        await geminiService.waitForFileActive(geminiFileInstance.name);
        console.log('Gemini file is active:', geminiFileInstance.name);
        
// Preparing the prompt and schema for Gemini generation
        const lawProjectSchemJsonSchema = projectHelper.getProjectFieldsJsonSchema();

        const prompt = `
            Eres un/a experto/a en proyectos de ley de Argentina. 
            
            En una interacción anterior, creaste el siguiente objeto JSON basado en el archivo del proyecto de ley:
            <previousLawProjectFields>
            ${JSON.stringify(previousLawProjectFields, null, 2)}
            </previousLawProjectFields>

            El usuario ha proporcionado los siguientes comentarios y solicitudes de edición:
            <userEditRequest>
            ${userEditRequest}
            </userEditRequest>

            Utilizando el archivo del proyecto de ley proporcionado, genera un nuevo objeto JSON actualizado que refleje las ediciones solicitadas por el usuario.
            
            IMPORTANTE:
            - No cambies de lenguaje las keys del JSON, deben ser exactamente las mismas.
            - Si no puedes encontrar la información en el proyecto de ley, devuelve una cadena vacía para ese campo.
            - Las preguntas que generes en "proposed_questions" deben ser simples y directas, enfocadas en ciudadanos comunes. Son preguntas que luego iran a un chat que detras trabajan agentes que tienen capacidades de RAG sobre el proyecto, o sobre conocimientos generales sobre el funcionamiento de el sistema legislativo argentino, o hasta puede buscar en Google (conocido como grounding)
        `

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
                responseJsonSchema: lawProjectSchemJsonSchema,
            }
        })
        
        console.log('Gemini response:', geminiResponse);

        const regeneratedFields = JSON.parse(geminiResponse.text);

        console.log('Regenerated fields:', regeneratedFields);
        return res.status(200).json({ project: {
            id: projectInstance.id,
            title: regeneratedFields.title,
            description: regeneratedFields.description,
            summary: regeneratedFields.summary,
            category: regeneratedFields.category,
            content: regeneratedFields.content,
            proposed_questions: regeneratedFields.proposed_questions || []
        } });
    } catch (error) {
        console.error('Error regenerating project fields:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } 
}

export const putSaveProjectFields = async (req, res) => {
    // Implementation for saving project fields.
    try {
        const { projectId } = req.params;
        const { title, description, summary, category, content, proposed_questions } = req.body;
        const projectInstance = await model.Project.findByPk(projectId);

        if (!projectInstance) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Update the project fields
        projectInstance.title = title || projectInstance.title;
        projectInstance.description = description || projectInstance.description;
        projectInstance.summary = summary || projectInstance.summary;
        projectInstance.category = category || projectInstance.category;
        projectInstance.content = content || projectInstance.content;
        if (proposed_questions) {
            projectInstance.proposed_questions = proposed_questions;
        }
        projectInstance.status = 'ready'
        
        await projectInstance.save();
        return res.status(200).json({
            message: 'Project fields saved successfully', project: {
                id: projectInstance.id,
                title: projectInstance.title,
                description: projectInstance.description,
                summary: projectInstance.summary,
                category: projectInstance.category,
                content: projectInstance.content,
                proposed_questions: projectInstance.proposed_questions || []
            }
        });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const postPublishProject = async (req, res) => {
    // Implementation for publishing the project.
    try {
        const { projectId } = req.params;
        const projectInstance = await model.Project.findByPk(projectId);

        if (!projectInstance) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // check the following fields are set:
        const requiredFields = ['title', 'description', 'summary', 'category', 'content'];
        for (const field of requiredFields) {
            if (!projectInstance[field] || (typeof projectInstance[field] === 'object' && Object.keys(projectInstance[field]).length === 0)) {
                return res.status(400).json({ message: `Cannot publish project. Field "${field}" is missing or empty.` });
            }
        }

        // status must be 'ready'
        if (projectInstance.status !== 'ready') {
            return res.status(400).json({ message: `Cannot publish project. Project status must be 'ready'. Current status: '${projectInstance.status}'` });
        }

        // For now, just set the publishedAt field to current date
        projectInstance.publishedAt = new Date();
        projectInstance.status = 'published';
        await projectInstance.save();

        return res.status(200).json({
            message: 'Project published successfully', project: {
                id: projectInstance.id,
                publishedAt: projectInstance.publishedAt
            }
        });
        
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const postUnpublishProject = async (req, res) => {
    // Implementation for unpublishing the project.
    try {
        const { projectId } = req.params;
        const projectInstance = await model.Project.findByPk(projectId);

        if (!projectInstance) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Set the publishedAt field to null
        projectInstance.publishedAt = null;
        projectInstance.status = 'ready';
        await projectInstance.save();

        return res.status(200).json({
            message: 'Project unpublished successfully', project: {
                id: projectInstance.id,
                publishedAt: projectInstance.publishedAt
            }
        });
        
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}