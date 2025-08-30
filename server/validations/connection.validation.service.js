import { Joi, celebrate } from 'celebrate'

export default class ConnectionValidations {
    static startParty = celebrate({
        body: Joi.object({
            source: Joi.object({
                platform: Joi.string()
                    .valid('youtube', 'netflix')
                    .required()
                    .messages({
                        'any.required': 'platform is required as a string.',
                        'string.base': 'platform must be a string.',
                        'any.only': 'platform must be youtube or netflix.'
                    }),
                url: Joi.string()
                    .required()
                    .messages({
                        'any.required': 'the source url is required as a string.',
                        'string.base': 'the source url must be a string.'
                    }),
                time: Joi.number()
                    .required()
                    .messages({
                        'any.required': 'source time is required.',
                        'number.base': 'source time must be a number.'
                    })
            })
        })
    })

    static startGuestParty = celebrate({
        body: Joi.object({
            source: Joi.object({
                platform: Joi.string()
                    .valid('youtube', 'netflix')
                    .required()
                    .messages({
                        'any.required': 'platform is required as a string.',
                        'string.base': 'platform must be a string.',
                        'any.only': 'platform must be youtube or netflix.'
                    }),
                url: Joi.string()
                    .required()
                    .messages({
                        'any.required': 'the source url is required as a string.',
                        'string.base': 'the source url must be a string.'
                    }),
                time: Joi.number()
                    .required()
                    .messages({
                        'any.required': 'source time is required.',
                        'number.base': 'source time must be a number.'
                    })
            }),
            name: Joi.string()
                .trim()
                .min(4)
                .max(14)
                .messages({
                    'string.min': 'name must have at least 4 characters.',
                    'string.max': 'name must have at most 14 characters.'
                })
        })
    })
}
