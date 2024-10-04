import jwt from "jsonwebtoken";
const { decode, sign } = jwt
import {authService} from "../services/auth.services.js";
async function refresher(token) {
    try {
        const {ID}=decode(token)
        const accesToken=sign({ID,type:'acces'},process.env.SECRET_KEY,{expiresIn:'2d'})
        const refreshToken=sign({ID,type:'refresh'},process.env.SECRET_KEY,{expiresIn:'4d'})
        await authService.setUserTokens(ID,{accesToken,refreshToken})
        return {accesToken,refreshToken}
    } catch (error) {
        throw error
    }
}
export default refresher