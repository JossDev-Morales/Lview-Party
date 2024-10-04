import prisma from "../../prisma/postgresClient.js";
import {AuthError} from "../errorsHandler/AuthError.class.js";

export class authService {
    static async getAuthByMail(email){
        try {
            const auth=await prisma.auth.findFirst({
                where:{email:email}
            })
            return auth
        } catch (error) {
            throw new AuthError({ name: "AuthGetterFailed", message: error.message, original: error, type: "getter", code: 10 })
        }
    }
    static async getTokensByUser(ID) {
        try {
            const auth = await prisma.auth.findFirst({
                where: { userId: ID }
            })
            return { accesToken: auth.accesToken, refreshToken: auth.refreshToken }
        } catch (error) {
            throw new AuthError({ name: "AuthTokensGetter", message: error.message, original: error, type: "getter", code: 10 })
        }
    }
    static async setUserTokens(ID, tokens) {
        try {
            const { accesToken, refreshToken } = tokens
            await prisma.auth.update({ data: { accesToken, refreshToken }, where: { userId: ID } })
        } catch (error) {
            throw new AuthError({ name: "AuthTokensSetter", message: error.message, original: error, type: "setter", code: 11 })
        }
    }
}
