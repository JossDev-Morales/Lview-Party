import { AuthError } from "../errorsHandler/AuthError.class.js";

export function errorHandlerMdwr(err,req,res,next) {
    try {
        if(err instanceof AuthError){
            err.log()
            res.status(400).json(err.build())
        }else{
            console.warn(err)
            res.status(500).json({
                error:{
                    name:err.name,
                    message:err.message
                }
            })
        }
    } catch (error) {
        console.warn(error)
            res.status(500).json({
                error:{
                    name:error.name,
                    message:error.message
                }
            })
    }
}