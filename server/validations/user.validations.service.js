import { Joi, Segments, celebrate } from 'celebrate'
export default class UserValidations {
    static userUpdate = celebrate({
        body: Joi.object({
            icon: Joi.object({
                seed: Joi.string().required(),
                style: Joi.string().required()
            }),
            name: Joi.string().trim().min(4).max(14),
            color:Joi.string().pattern(new RegExp('^[a-fA-F0-9]{3}]$|^[a-fA-F0-9]{6}]$'))
        })
    })
    static addContent = celebrate({
        params: Joi.object({
            session: Joi.string().uuid({ version: 'uuidv4' }).required(),
            message: Joi.string().uuid({ version: 'uuidv4' }).required(),
            content: Joi.string().uuid({ version: 'uuidv4' }).required()
        })
    })
    static getImage = celebrate({
        params: Joi.object({
            name: Joi.string().required()
        })
    })
}