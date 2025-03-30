import { Joi, Segments, celebrate } from 'celebrate'
export default class UserValidations {
    static iconSelection=celebrate({
        body:Joi.object({
            seed:Joi.string().required(),
            style:Joi.string().required()
        })
    })
    static changeName=celebrate({
        body:Joi.object({
            name: Joi.string().trim().min(4).max(14).required()
        })
    })
    static addContent=celebrate({
        params:Joi.object({
            session:Joi.string().uuid({version:'uuidv4'}).required(),
            message:Joi.string().uuid({version:'uuidv4'}).required(),
            content:Joi.string().uuid({version:'uuidv4'}).required()
        })
    })
    static getImage=celebrate({
        params:Joi.object({
            name:Joi.string().required()
        })
    })
}