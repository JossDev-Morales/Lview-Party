import { Joi, Segments, celebrate } from 'celebrate'
export default class AuthValidations {
    static signupValidation = celebrate({
        body: Joi.object({
            name: Joi.string().trim().min(4).max(14).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(8).required(),
            token:  Joi.string().required()
        }),
    })
    static signinValidation = celebrate({
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(8).required(),
        })
    })
    static authToken = celebrate({
        [Segments.HEADERS]: Joi.object({
            authorization: Joi.string()
                .pattern(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid authorization token format',
                    'any.required': 'Authorization token is required',
                }),
        }).unknown()
    })
}