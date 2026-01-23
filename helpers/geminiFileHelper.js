import model from '../models/index.js';

// const checkIfFileExists = async (projectId) => {
//   try {
//     const geminiFile = await model.GeminiFile.findOne({ where: { projectId } });
//     if(!geminiFile) {
//       // there is no instance saved in database..
//       // this must be handled like an error
//       throw new Error(`No GeminiFile found for projectId: ${projectId}`);
//     }

//     // so there is an instance.
//     // Because Gemini Files API stores files for 48 hours, lets check if the file is still valid
    

//   } catch (error) {
//     console.error('Error checking GeminiFile existence:', error);
//     throw error;
//   }