import jwt from "jsonwebtoken";
const { JsonWebTokenError, decode,TokenExpiredError, verify } = jwt
import { AuthError } from "../errorsHandler/AuthError.class.js";
import { authService } from "../services/auth.services.js";
import { hasTokenExpired } from "../tools/tokenExpired.js";
import refresher from "../tools/refreshTokens.js";

export async function authTokenMdwr(req, res, next) {
    try {
        if (!req.headers.authorization) {
            throw new AuthError({
                name: 'InvalidAuthToken',
                message: 'The authorization token was invalid or was not provided',
                type: 'InvalidData',
                code: 1
            });
        }
        const token = req.headers.authorization.split(' ')[1];
        const tokenData= decode(token)
        if(!tokenData){
            throw new AuthError({
                name: 'InvalidAuthToken',
                message: 'The authorization token was invalid or was not provided',
                type: 'InvalidData',
                code: 1
            });
        }
        const tokensdb = await authService.getTokensByUser(tokenData.ID)
        if (tokensdb.accesToken == token) {
            if (hasTokenExpired(token)) {
                const tokens = await refresher(tokensdb.refreshToken); 
                authService.setUserTokens(tokenData.ID,tokens)
                const payload = verify(tokens.accesToken, process.env.SECRET_KEY);
                req.tokenPayload = payload;
                next();
            } else {
                const payload = verify(token, process.env.SECRET_KEY);
                req.tokenPayload = payload;
                next();
            }
        } else {
            throw new AuthError({
                name: 'FailedTokenComparition',
                message: 'The token comparition with the db token failed',
                type: 'TokenComparition',
                code: 2
            });
        }
    } catch (error) {
        if (error instanceof JsonWebTokenError) {
            // Manejo genérico para errores de JWT (excepto token expirado)
            next(new AuthError({
                name: 'InvalidJWT',
                message: 'The JWT format was invalid or the token is otherwise invalid',
                type: 'InvalidToken',
                code: 3
            }));
        } else {
            // Otros errores no relacionados con JWT
            next(error);
        }
    }
}
