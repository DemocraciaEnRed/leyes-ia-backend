import express from 'express';
import model from '../models/index.js';
import geminiService from '../services/gemini.js'; 
import upload from '../services/multer.js';

// initialize router
const router = express.Router();

// -----------------------------------------------
// BASE   /test
// -----------------------------------------------

router.get('/', async (req, res) => {
    const checkIfExists = await model.Project.findOne({ where: { code: 'TEST123' } });
    if (checkIfExists) {
        // delete
        await model.KnowledgeBase.destroy({ where: { projectId: checkIfExists.id } });
        await model.Project.destroy({ where: { id: checkIfExists.id } });
    }

    const newProject = await model.Project.create({
        code: 'TEST123',
        name: 'Test Project',
        slug: 'test-project',
        authorFullname: 'Test Author'
    });
    const newKnowledgeBase = await model.KnowledgeBase.create({
        name: 'Test Knowledge Base',
        digitalOceanBucket: process.env.DIGITALOCEAN_SPACES_BUCKET,
        projectId: newProject.id
    });

    console.log(await newKnowledgeBase.digitalOceanBucketFolder);
    
    return res.status(200).send()
});

router.post('/upload-to-gemini', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const uploadedFile = await geminiService.uploadFile(file.buffer, file.originalname, file.mimetype);
      return res.status(200).json(uploadedFile);
    } catch (error) {
        console.error('Error in /upload-to-gemini route:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/get-file', async (req, res) => {
  try {
    const fileName = req.body.fileName;
    if (!fileName) { 
      return res.status(400).json({ error: 'No fileName provided' });
    }

    const fileMetadata = await geminiService.getFile(fileName);
    return res.status(200).json(fileMetadata);
  } catch (error) {
    console.error('Error in /check-file route:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/check-file', async (req, res) => {
  try {
    const fileName = req.body.fileName;
    if (!fileName) { 
      return res.status(400).json({ error: 'No fileName provided' });
    }

    const fileExists = await geminiService.checkIfFileExists(fileName);
    return res.status(200).json({ exists: fileExists });
  } catch (error) {
    console.error('Error in /check-file route:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/delete-file', async (req, res) => {
  try {
    const fileName = req.body.fileName;
    if (!fileName) {
      return res.status(400).json({ error: 'No fileName provided' });
    }

    const deleteResult = await geminiService.deleteFile(fileName);
    return res.status(200).json({ deleted: deleteResult });
  } catch (error) {
    console.error('Error in /delete-file route:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
