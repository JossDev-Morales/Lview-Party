import { Socket } from "socket.io";
import { verifyAccesToken, validateAccesType } from "../tools/validateTokens.js";
import {authService} from "../services/auth.services.js";
import jwt from "jsonwebtoken";
const { verify, decode } = jwt
import {AuthError} from "../errorsHandler/AuthError.class.js";
import refresher from "../tools/refreshTokens.js";
import { v4 } from "uuid";

/**
 * @param {Socket} socket
 */
export async function socketAuth(socket, next) {
    /**@type {{acces,refresh}} */
    const {token} = socket.handshake.auth
    const {guest} = socket.handshake.query
    try {
        if(!token){
            if(guest){
                socket.data.type='guest'
                socket.data.ID = v4()
                next()
                return;
            } else {
                throw new AuthError({name:'MissingToken', message:'The token was not received',type:'UnreceivedData',code:1})
            }
        }
        const { ID } = verify(token, process.env.SECRET_KEY)
        const { accesToken } = await authService.getTokensByUser(ID)
        if (!validateAccesType(token)) {
            throw new AuthError({ name: 'InvalidTokenTypeReceived', message: "An invalid type for the acces token was received, service denied by auth token type error", type: 'auth', code: 2 })
        }
        if (verifyAccesToken(token, accesToken)) {
            socket.data.type='registered'
            socket.data.ID=ID
            next()
            return;
        } else {
            throw new AuthError({ name: 'InvalidTokenReceived', message: 'An invalid token was received, service denied by auth token comparison', type: 'auth', code: 3 })
        }
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.log("expired");
            const { ID } = decode(token)
            const { refreshToken } = await authService.getTokensByUser(ID)
            const newTokens = refresher(refreshToken)
            socket.emit('refresh',newTokens)
            next()
            return;
        } else if(!error.errorType)/* tipo de error para identificar las clases custom de error */ {
            console.log(error);
            const serverError=new Error('ServerError')
            serverError.message='something went wrong on our serverside'
            serverError.serverErrorName=error.name
            next(serverError)
            return;
        } else {
            error.log()
            next(error)
            return;
        }
    }
}