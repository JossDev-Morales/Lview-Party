import { Joi, Segments, celebrate } from 'celebrate'
export default class ConnectionValidations {
    static startParty = celebrate({
        body: Joi.object({
            source: Joi.object({
                platform: Joi.string().allow('youtube','netflix').required().message('platform is required as a string.'),
                url:Joi.string().required().message('the source url is required as a string.'),
                time:Joi.number().required().message('source time is required.')
            })
        })
    })
    static startGuestParty = celebrate({
        body: Joi.object({
            source: Joi.object({
                platform: Joi.string().allow('youtube','netflix').required().message('platform is required as a string.'),
                url:Joi.string().required().message('the source url is required as a string.'),
                time:Joi.number().required().message('source time is required.')
            }),
            name:Joi.string().trim().min(4).max(14),
        })
    })
}