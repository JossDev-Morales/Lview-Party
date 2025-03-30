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
        const data=decode(token)
        console.log(data)
        return data.type==='access'
    } catch (error) {
        throw error
    }
}

export {verifyAccesToken,validateAccesType}