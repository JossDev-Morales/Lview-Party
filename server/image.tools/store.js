import multer, {diskStorage} from 'multer'
import {v4} from 'uuid'
import {extname} from 'path'
const imageStorage=diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'uploads/')
    },
    filename:(req,file,cb)=>{
        cb(null,`${v4()}${extname(file.originalname)}`)
    }
})
const uploader=multer({
    storage:imageStorage,
    fileFilter:(req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes.'), false);
        }
    },
    limits: {
        fields:0,
        fileSize: 8 * 1024 * 1024, // Maximo 8 MB por archivo
        files: 20,                 // Maximo 20 archivos por solicitud
        fieldSize: 100 * 1024 * 1024, // Maximo 100 MB en el campo de archivos
    },
})
export default uploader