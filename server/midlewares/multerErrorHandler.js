import { Storage } from "../virtualdata/virtualStorage.js"
import { MulterError } from "multer"
/**
 * 
 * @param {MulterError} err 
 */
export default function multerErrorHandler(err,req,res,next){
    try {
        const {session,message} = req.params
        let Session=Storage.findByID(session)
        if(err instanceof MulterError){
            Session.io.emit(`imageuploader-${message}`,{
                status:0,
                reason:{
                    cause:err.cause,
                    code:err.code,
                    name:err.name
                }
            })
        } else {
            next(err)
        }
    } catch (error) {
        next(err)
    }
}