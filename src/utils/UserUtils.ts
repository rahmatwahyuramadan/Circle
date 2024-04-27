import Joi from "joi";

export const update = Joi.object({
    bio: Joi.string().allow(""),
    fullname : Joi.string().allow("")
    
})