import multer from 'multer';
const storage = multer.memoryStorage();

export default multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  }
});