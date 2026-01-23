import multer from 'multer';
const storage = multer.memoryStorage();

export default multer({ 
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB file size limit
  }
});