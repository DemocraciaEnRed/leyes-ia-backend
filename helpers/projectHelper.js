import { v4 as uuidv4 } from 'uuid';
import model from '../models/index.js';
import geminiService from '../services/gemini.js'; 
import s3Client from '../services/s3Client.js';
import { z } from "zod";

export const generateUniqueProjectCode = async () => {
    let newProjectCode = uuidv4().slice(0, 13).replace(/-/g, ''); // short unique code
    console.log('Generated initial project code:', newProjectCode);
    while (true) {
        const projectExists = await model.Project.findOne({ where: { code: newProjectCode } });
        if (!projectExists) {
            break;
        }
        console.warn('Project code collision detected:', newProjectCode);
        newProjectCode = uuidv4().slice(0, 13).replace(/-/g, '');  
    }
    return newProjectCode;
}

export const getCategorias = () => {
    // Pocas (10–25 como máximo)
    // Estables en el tiempo
    // Mutuamente exclusivas en lo posible
    // Pensadas para navegación (menú, secciones, dashboards)
    // 1 categoría principal por proyecto (máx. 2 si querés flexibilidad)
    return [
    "Asuntos Constitucionales",
    "Economía y Hacienda",
    "Educación y Cultura",
    "Salud Pública",
    "Justicia y Derechos Humanos",
    "Seguridad y Defensa",
    "Trabajo y Seguridad Social",
    "Medio Ambiente y Recursos Naturales",
    "Ciencia, Tecnología e Innovación",
    "Relaciones Exteriores",
    "Infraestructura y Transporte",
    "Agricultura, Ganadería y Pesca",
    "Género y Diversidad",
    "Desarrollo Social y Niñez"
  ];
}

export const fetchOrUploadFileToGemini = async (projectId) => {
    const projectInstance = await model.Project.findByPk(projectId);
    const mainFile = await projectInstance.getMainFile();

    if (!mainFile) {
        throw new Error(`No main file found for project ID: ${projectId}`);
    }

    // Check if GeminiFile already exists
    const existingGeminiFile = await model.GeminiFile.findOne({ where: { projectId } });
    if (existingGeminiFile) {
        const geminiFileExpired = await existingGeminiFile.isExpired();
        if (geminiFileExpired) {
          // delete instance
            await existingGeminiFile.destroy();
        }
        else {
            // there is an existing valid GeminiFile record and we can return it
          return existingGeminiFile
        }
    }

    
    // Upload to Gemini
    // First we need to download it from s3
    const pdfResp = await s3Client.downloadFile(mainFile.s3Key);
    console.log(pdfResp)
    const pdfBuffer = Buffer.from(await pdfResp.transformToByteArray())

    const uploadedFile = await geminiService.uploadFile(
        pdfBuffer,
        mainFile.name,
        mainFile.mimeType
    );
    
    // Save GeminiFile record
    const newGeminiFile = await model.GeminiFile.create({
        projectId,
        name: uploadedFile.name,
        displayName: uploadedFile.displayName,
        uri: uploadedFile.uri,
        mimeType: uploadedFile.mimeType,
        state: uploadedFile.state,
        expirationTime: uploadedFile.expirationTime,
        lastApiResponse: uploadedFile,
        lastApiResponseAt: new Date(),
    });

    return newGeminiFile;    
}

export const getProjectFields = () => {
    const lawProjectFields = z.object({
            title: z.string().describe("Titulo de proyecto de Ley. Evitar artificios como 'Proyecto de Ley para...'. Evitar que sea todo en mayusculas."),
            description: z.string().describe("Descripcion del proyecto de Ley. Este campo soporta texto simple, no formato Markdown. Usa tu mejor criterio para usar formatos como negritas, cursivas, listas, enlaces, etc. En lo posible que no supere 450 caracteres."),
            summary: z.string().describe("Resumen del proyecto de Ley. Explica de forma simple y breve la idea principal del proyecto de ley, mencionando al final quien impulsa el proyecto. La idea es que no pase un parrafo y que no se extienda de mas de 768 caracteres. Soporta formato Markdown"),
            category: z.enum(getCategorias()).describe("Categoria del proyecto de Ley, debe ser una de las siguientes opciones del listado predefinido."),
            content: z.object({
                objective: z.string().describe("Explicacion del objetivo del proyecto de ley. (Soporta formato Markdown. Usa tu mejor criterio para usar formatos como negritas, cursivas, listas, enlaces, etc. Preferemente no incluir titulos, que sea simplemente cuerpo de texto, como maximo hasta dos parrafos, pero se permite formato Markdown)"),
                justification: z.string().describe("Explicacion de la justificacion del proyecto de ley. (Soporta formato Markdown. Usa tu mejor criterio para usar formatos como negritas, cursivas, listas, enlaces, etc. Preferemente no incluir titulos, que sea simplemente cuerpo de texto, como maximo hasta dos parrafos, pero se permite formato Markdown)"),
                key_changes: z.string().describe("Explicacion de los cambios principales que introduce el proyecto de ley. (Soporta formato Markdown. Usa tu mejor criterio para usar formatos como negritas, cursivas, listas, enlaces, etc. Preferemente no incluir titulos, que sea simplemente cuerpo de texto, como maximo hasta dos parrafos, pero se permite formato Markdown)"),
                impact_on_society: z.string().describe("Explicacion del impacto en la sociedad que tendria la aprobacion del proyecto de ley. (Soporta formato Markdown. Usa tu mejor criterio para usar formatos como negritas, cursivas, listas, enlaces, etc. Preferemente no incluir titulos, que sea simplemente cuerpo de texto, como maximo hasta dos parrafos, pero se permite formato Markdown)"),
            }).describe("Un objeto JSON con las siguientes keys: objective, justification, key_changes, impact_on_society. Cada key debe contener una breve explicacion relacionada con el proyecto de ley. "),
            proposed_questions: z.array(z.string()).describe("Un array de strings, cada string es una pregunta que podria hacerse un ciudadano comun sobre el proyecto de ley. Deben ser preguntas simples y directas, no mas de 7 preguntas. El formato es texto simple.").max(7).optional(),
        })
    return lawProjectFields;
}

export const getProjectFieldsJsonSchema = () => {
    // Preparing the prompt and schema for Gemini generation
        const lawProjectFields = getProjectFields();

        return lawProjectFields.toJSONSchema();
} 
