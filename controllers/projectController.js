import s3Client from '../services/s3Client.js';
import fs from 'fs';
import model from '../models/index.js';
import * as projectHelper from '../helpers/projectHelper.js'
import { client as DigitalOceanGradientClient } from '../services/gradient.js';
import geminiService from '../services/gemini.js';
import { createUserContent, createPartFromUri } from '@google/genai'
import { z } from "zod";
import { PROJECT_ACCESS_ROLES, PROJECT_MEMBER_ROLES } from '../middlewares/projectAccess.js';
import { createSystemLog, SYSTEM_LOG_ACTIONS } from '../services/systemLog.js';
import { AI_USAGE_ACTIONS, recordProjectAiUsageEvent } from '../services/aiUsageAudit.js';


export const getProjects = async (req, res) => {
    try {
        const { category, draft, limit, scope } = req.query;
        let whereClause = {};
        const include = [];

        const shouldLoadManagedScope = scope === 'managed';

        if (draft === 'true' && !shouldLoadManagedScope) {
            return res.status(400).json({ message: 'draft=true requires scope=managed' });
        }

        if (shouldLoadManagedScope) {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            if (req.user.role !== 'admin') {
                const managerMemberships = await model.ProjectMember.findAll({
                    where: {
                        userId: req.user.id,
                        projectRole: PROJECT_MEMBER_ROLES.MANAGER,
                    },
                    attributes: ['projectId'],
                });

                const managerProjectIds = managerMemberships.map((membership) => membership.projectId);
                const ownershipAndManagementFilter = [{ projectOwnerId: req.user.id }];

                if (managerProjectIds.length > 0) {
                    ownershipAndManagementFilter.push({
                        id: {
                            [model.Sequelize.Op.in]: managerProjectIds,
                        },
                    });
                }

                whereClause[model.Sequelize.Op.or] = ownershipAndManagementFilter;

                include.push({
                    model: model.ProjectMember,
                    as: 'projectMembers',
                    where: {
                        userId: req.user.id,
                        projectRole: PROJECT_MEMBER_ROLES.MANAGER,
                    },
                    attributes: ['id', 'projectRole', 'userId', 'projectId'],
                    required: false,
                });
            }
        }

        if (category !== undefined) {
            // we only get the index
            const categorias = projectHelper.getCategorias();
            const categoryIndex = parseInt(category, 10);
            if (!Number.isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < categorias.length) {
                const namedCategory = categorias[categoryIndex];
                whereClause.category = namedCategory;
            }
        }

        if (draft === 'true') {
            whereClause.publishedAt = null;
        } else if (draft === 'false') {
            whereClause.publishedAt = { [model.Sequelize.Op.ne]: null };
        } else if (!shouldLoadManagedScope) {
            whereClause.publishedAt = { [model.Sequelize.Op.ne]: null };
        }

        let parsedLimit;
        if (limit !== undefined) {
            const rawLimit = parseInt(limit, 10);
            if (!Number.isNaN(rawLimit) && rawLimit > 0) {
                parsedLimit = Math.min(rawLimit, 10);
            }
        }

        const queryOptions = {
            where: whereClause,
            order: [['publishedAt', 'DESC']],
            include,
            distinct: true,
        };

        if (parsedLimit) {
            queryOptions.limit = parsedLimit;
        }

        const projects = await model.Project.findAll(queryOptions);
        return res.status(200).json({ projects });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const getLatestPublishedProjects = async (req, res) => {
    try {
        const projects = await model.Project.findAll({
            where: {
                publishedAt: {
                    // This ensures we only get projects that have a non-null publishedAt, i.e. they are published.
                    [model.Sequelize.Op.ne]: null,   
                },
                // Status must not be null or "ready"
                status: {
                    [model.Sequelize.Op.and]: [
                        { [model.Sequelize.Op.ne]: null },
                        { [model.Sequelize.Op.ne]: 'ready' }
                    ]
                }
            },
            // add the user info of the owner
            include: [
                {
                    as: 'owner',
                    model: model.User,
                    attributes: ['id', 'firstName', 'lastName', 'fullName', 'email', 'imageUrl', 'gravatarUrl'],
                    // include virtual
                },
            ],
            attributes: ['id', 'slug', 'title', 'description', 'publishedAt', 'authorFullname', 'category'],
            order: [['publishedAt', 'DESC']],
            limit: 5,
        });


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

        let currentUserMembership = null;
        if (req.user && req.user.role !== 'admin') {
            if (project.projectOwnerId === req.user.id) {
                currentUserMembership = {
                    id: null,
                    projectRole: PROJECT_ACCESS_ROLES.OWNER,
                    userId: req.user.id,
                    projectId: project.id,
                };
            } else {
                currentUserMembership = await model.ProjectMember.findOne({
                    where: {
                        projectId,
                        userId: req.user.id,
                    },
                    attributes: ['id', 'projectRole', 'userId', 'projectId'],
                });
            }
        }

        return res.status(200).json({
            project,
            currentUserMembership,
        });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const getPublishedProjectBySlug = async (req, res) => {
    try {
        const { projectSlug } = req.params;

        const project = await model.Project.findOne({
            where: {
                slug: projectSlug,
                status: 'published',
                publishedAt: {
                    [model.Sequelize.Op.ne]: null
                }
            },
            attributes: [
                'id',
                'code',
                'status',
                'name',
                'slug',
                'filename',
                'authorFullname',
                'title',
                'category',
                'description',
                'summary',
                'content',
                'proposed_questions',
                'publishedAt',
                'createdAt',
                'updatedAt'
            ]
        });

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
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (req.user.role !== 'legislator') {
            return res.status(403).json({ message: 'Forbidden: Only legislators can create projects' });
        }

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
            projectOwnerId: req.user.id,
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

        await createSystemLog({
            performedBy: req.user.id,
            action: SYSTEM_LOG_ACTIONS.PROJECT_CREATED,
            metadata: {
                projectId: newProject.id,
                projectCode: newProject.code,
                ownerUserId: req.user.id,
            },
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
    const { projectId } = req.params;
    const startedAt = Date.now();
    const geminiModel = 'gemini-2.5-flash';

    try {
        const projectInstance = await model.Project.findByPk(projectId);

        if (!projectInstance) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (projectInstance.status === 'published') {
            return res.status(400).json({
                error: 'PROJECT_PUBLISHED_READ_ONLY',
                message: 'Cannot generate fields for a published project. Unpublish it first.',
            });
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
            model: geminiModel,
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

        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.PROJECT_FIELDS_GENERATE,
            model: geminiModel,
            status: 'success',
            geminiResponse,
            latencyMs: Date.now() - startedAt,
            metadata: {
                route: req.originalUrl,
            },
        });

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
        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.PROJECT_FIELDS_GENERATE,
            model: geminiModel,
            status: 'error',
            latencyMs: Date.now() - startedAt,
            errorMessage: error?.message || 'Unknown error',
            metadata: {
                route: req.originalUrl,
            },
        });
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const postRegenerateProjectFields = async (req, res) => {
    // Implementation for regenerating project fields using AI.
    const { projectId } = req.params
    const startedAt = Date.now();
    const geminiModel = 'gemini-2.5-flash';

    try {
        const { userEditRequest, previousLawProjectFields } = req.body;
        const projectInstance = await model.Project.findByPk(projectId);

        if (!projectInstance) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (projectInstance.status === 'published') {
            return res.status(400).json({
                error: 'PROJECT_PUBLISHED_READ_ONLY',
                message: 'Cannot regenerate fields for a published project. Unpublish it first.',
            });
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
            model: geminiModel,
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

        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.PROJECT_FIELDS_REGENERATE,
            model: geminiModel,
            status: 'success',
            geminiResponse,
            latencyMs: Date.now() - startedAt,
            metadata: {
                route: req.originalUrl,
            },
        });

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
        await recordProjectAiUsageEvent({
            projectId,
            userId: req.user?.id,
            action: AI_USAGE_ACTIONS.PROJECT_FIELDS_REGENERATE,
            model: geminiModel,
            status: 'error',
            latencyMs: Date.now() - startedAt,
            errorMessage: error?.message || 'Unknown error',
            metadata: {
                route: req.originalUrl,
            },
        });
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

        if (projectInstance.status === 'published') {
            return res.status(400).json({
                error: 'PROJECT_PUBLISHED_READ_ONLY',
                message: 'Cannot edit fields for a published project. Unpublish it first.',
            });
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

        if (req.user) {
            await createSystemLog({
                performedBy: req.user.id,
                action: SYSTEM_LOG_ACTIONS.PROJECT_UPDATED,
                metadata: {
                    projectId: projectInstance.id,
                    changedFields: {
                        title: title !== undefined,
                        description: description !== undefined,
                        summary: summary !== undefined,
                        category: category !== undefined,
                        content: content !== undefined,
                        proposed_questions: proposed_questions !== undefined,
                    },
                },
            });
        }

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

        const summaryIncompleteFields = projectInstance.summaryIncompleteFields || [];

        if (summaryIncompleteFields.length > 0) {
            return res.status(400).json({
                error: 'PROJECT_SUMMARY_INCOMPLETE',
                message: 'Cannot publish project. Summary fields are incomplete.',
                summaryIncompleteFields,
            });
        }

        if (projectInstance.status === 'created') {
            return res.status(400).json({
                error: 'PROJECT_STATUS_NOT_READY',
                message: `Cannot publish project. Project status cannot be 'created'. Current status: '${projectInstance.status}'`,
                summaryIncompleteFields,
            });
        }

        if (projectInstance.publishedAt) {
            return res.status(400).json({
                error: 'PROJECT_ALREADY_PUBLISHED',
                message: 'Cannot publish project. Project is already published.',
                summaryIncompleteFields,
            });
        }

        // For now, just set the publishedAt field to current date
        projectInstance.publishedAt = new Date();
        projectInstance.status = 'published';
        await projectInstance.save();

        if (req.user) {
            await createSystemLog({
                performedBy: req.user.id,
                action: SYSTEM_LOG_ACTIONS.PROJECT_PUBLISHED,
                metadata: {
                    projectId: projectInstance.id,
                },
            });
        }

        return res.status(200).json({
            message: 'Project published successfully', project: {
                id: projectInstance.id,
                status: projectInstance.status,
                publishedAt: projectInstance.publishedAt,
                summaryIncompleteFields,
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

        if (req.user) {
            await createSystemLog({
                performedBy: req.user.id,
                action: SYSTEM_LOG_ACTIONS.PROJECT_UNPUBLISHED,
                metadata: {
                    projectId: projectInstance.id,
                },
            });
        }

        return res.status(200).json({
            message: 'Project unpublished successfully', project: {
                id: projectInstance.id,
                status: projectInstance.status,
                publishedAt: projectInstance.publishedAt,
                summaryIncompleteFields: projectInstance.summaryIncompleteFields || [],
            }
        });
        
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'There was an error' })
    }
}

export const patchProjectOwner = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Only admin can change project owner' });
        }

        const { projectId } = req.params;
        const nextOwnerUserId = Number.parseInt(req.body?.projectOwnerId, 10);

        if (Number.isNaN(nextOwnerUserId)) {
            return res.status(400).json({ message: 'Missing or invalid projectOwnerId' });
        }

        const [projectInstance, nextOwnerUser] = await Promise.all([
            model.Project.findByPk(projectId),
            model.User.findByPk(nextOwnerUserId),
        ]);

        if (!projectInstance) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!nextOwnerUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const previousOwnerUserId = projectInstance.projectOwnerId;
        if (previousOwnerUserId === nextOwnerUserId) {
            return res.status(200).json({
                message: 'Project owner unchanged',
                project: {
                    id: projectInstance.id,
                    projectOwnerId: projectInstance.projectOwnerId,
                },
            });
        }

        projectInstance.projectOwnerId = nextOwnerUserId;
        await projectInstance.save();

        await createSystemLog({
            performedBy: req.user.id,
            action: SYSTEM_LOG_ACTIONS.MEMBER_ROLE_UPDATED,
            metadata: {
                projectId: projectInstance.id,
                previousOwnerUserId,
                newOwnerUserId: nextOwnerUserId,
                actionType: 'owner_transfer',
            },
        });

        return res.status(200).json({
            message: 'Project owner updated successfully',
            project: {
                id: projectInstance.id,
                projectOwnerId: projectInstance.projectOwnerId,
            },
        });
    } catch (error) {
        console.error('Error updating project owner:', error);
        return res.status(500).json({ message: 'There was an error' });
    }
}