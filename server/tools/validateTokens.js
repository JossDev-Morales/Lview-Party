import { decode } from "jsonwebtoken";

function verifyAccesToken(publicToken,accesToken) {
    try {
        if (publicToken==accesToken) {
            return true
        }
        return false
    } catch (error) {
        throw error
    }
}
function validateAccesType(token) {
    try {
        const {type}=decode(token)
        return type==='acces'
    } catch (error) {
        throw error
    }
}

export {verifyAccesToken,validateAccesType}