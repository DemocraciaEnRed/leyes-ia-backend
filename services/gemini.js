import { GoogleGenAI, createUserContent, createPartFromUri, } from "@google/genai";

// Notes regarding Google AI

// Document Understanding API
// https://ai.google.dev/gemini-api/docs/document-processing

/**
 * Gemini supports PDF files up to 50MB or 1000 pages.
 * This limit applies to both inline data and Files API uploads.
 * Each document page is equivalent to 258 tokens.
 */ 

/** 
 * Document types
 * Technically, you can pass other MIME types for document understanding, like TXT, Markdown, HTML, XML, etc. However, document vision only meaningfully understands PDFs. Other types will be extracted as pure text, and the model won't be able to interpret what we see in the rendering of those files. Any file-type specifics like charts, diagrams, HTML tags, Markdown formatting, etc., will be lost.
 * For best results:
 * - Rotate pages to the correct orientation before uploading.
 * - Avoid blurry pages.
 * - If using a single page, place the text prompt after the page.
 */

/**
 * Usage info
 * You can use the Files API to upload and interact with media files.
 * The Files API lets you store up to 20 GB of files per project, with a per-file maximum size of 2 GB.
 * Files are stored for 48 hours. During that time, you can use the API to get metadata about the files, but you can't download the files.
 * The Files API is available at no cost in all regions where the Gemini API is available.
 */


const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
});



/**
 * Uploads a document asynchronously to the Gemini API.
 * This method is not available in Vertex AI. Supported upload sources:
 * Node.js: File path (string) or Blob object.
 * Browser: Blob object (e.g., File).
 * @param {Buffer|Blob} fileBuffer - The file buffer or blob to upload.
 * @param {string} fileName - The name of the file.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {Promise<Object>} A promise that resolves to the uploaded file object.
 * @throws {Error} Throws an error if the upload fails.
 */
const uploadFile = async (fileBuffer, fileName, mimeType) => {
  try {
    const uploadedFile = await ai.files.upload({
      file: new Blob([fileBuffer], { type: mimeType }),
      config: { mimeType: mimeType, displayName: fileName }
    })
    return uploadedFile;
  } catch (error) {
    console.error('Error uploading file to Gemini:', error);
    throw error;
  }
}


/**
 * Retrieves the metadata of a document by its file name.
 *
 * @async
 * @function getDocumentMetadata
 * @param {string} fileName - The name of the file whose metadata is to be fetched.
 * @returns {Promise<Object>} A promise that resolves to the metadata of the fetched file.
 * @throws {Error} Throws an error if there is an issue fetching the file metadata.
 */
const getFile = async (fileName) => {
  try {
    const fetchedFile = await ai.files.get({ name: fileName });
    // update GeminiFile instance with latest metadata if needed
    return fetchedFile;
  } catch (error) {
    console.error('Error fetching Gemini file metadata:', error);
    throw error;
  }
}

const checkIfFileExists = async (fileName) => { 
  try {
    const fetchedFile = await ai.files.get({ name: fileName });
    return !!fetchedFile;
  } catch (error) {
    // Google Gemini API returns ApiError: {"error":{"code":403,
    // "message":"You do not have permission to access 
    // the File xxxxxxxx or it may not exist.","status":"PERMISSION_DENIED"}}
    if (error?.message?.includes('PERMISSION_DENIED')) {
      return false;
    }
    console.error('Error checking Gemini file existence:', error);
    throw error;
  }
}

const deleteFile = async (fileName) => {
  try {
    await ai.files.delete({ name: fileName });
    return true;
  } catch (error) {
    console.error('Error deleting Gemini file:', error);
    throw error;
  }
}

/**
 * Checks if a file is active and ready for inference.
 *
 * @async
 * @function isFileActive
 * @param {string} fileName - The name of the file to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the file is active, false otherwise.
 * @throws {Error} Throws an error if there is an issue fetching the file metadata.
 */
const isFileActive = async (fileName) => {
  try {
    const file = await getFile(fileName);
    return file.state === 'ACTIVE';
  } catch (error) {
    console.error('Error checking if Gemini file is active:', error);
    throw error;
  }
}

const waitForFileActive = async (fileName, interval = 5000, timeout = 60000) => {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const isActive = await isFileActive(fileName);
        if (isActive) {
          return resolve(true);
        }

        if (Date.now() - startTime >= timeout) {
          return reject(new Error('Timeout waiting for file to become active'));
        }

        setTimeout(checkStatus, interval);
      } catch (error) {
        return reject(error);
      }
    };

    checkStatus();
  });
}

export default {
  ai,
  uploadFile,
  getFile,
  checkIfFileExists,
  isFileActive,
  deleteFile,
  waitForFileActive,
}
