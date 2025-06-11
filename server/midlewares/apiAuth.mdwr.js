import jwt from "jsonwebtoken";
const { JsonWebTokenError, decode, TokenExpiredError, verify } = jwt
import { AuthError } from "../errorsHandler/AuthError.class.js";
import { authService } from "../services/auth.services.js";
import { hasTokenExpired } from "../tools/tokenExpired.js";
import refresher from "../tools/refreshTokens.js";
import mailValidationStore from "../virtualdata/mailValidationStore.js";

export async function authTokenMdwr(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AuthError({
                name: 'InvalidAuthToken',
                message: 'The authorization token was invalid or was not provided',
                type: 'InvalidData',
                code: 1
            }));
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return next(new AuthError({
                name: 'InvalidAuthToken',
                message: 'The authorization token was invalid or was not provided',
                type: 'InvalidData',
                code: 1
            }));
        }

        const tokenData = decode(token);
        if (!tokenData || !tokenData.ID) {
            return next(new AuthError({
                name: 'InvalidAuthToken',
                message: 'Invalid token structure',
                type: 'InvalidData',
                code: 1
            }));
        }

        const tokensdb = await authService.getTokensByUser(tokenData.ID);
        if (!tokensdb) {
            return next(new AuthError({
                name: "UserNotFound",
                message: "The token belongs to a user that no longer exists",
                type: "InexistentUser",
                code: 5
            }));
        }

        if (tokensdb.accesToken !== token) {
            return next(new AuthError({
                name: 'FailedTokenComparison',
                message: 'The token comparison with the database token failed',
                type: 'TokenComparison',
                code: 2
            }));
        }

        if (hasTokenExpired(token)) {
            try {
                const tokens = await refresher(tokensdb.refreshToken);
                await authService.setUserTokens(tokenData.ID, tokens);
                const payload = verify(tokens.accesToken, process.env.SECRET_KEY);
                req.tokenPayload = payload;
            } catch (err) {
                return next(new AuthError({
                    name: 'TokenRefreshFailed',
                    message: 'Could not refresh the token',
                    type: 'TokenError',
                    code: 4
                }));
            }
        } else {
            req.tokenPayload = verify(token, process.env.SECRET_KEY);
        }

        next(); // ✅ Solo llamamos `next()` si todo está validado

    } catch (error) {
        if (error instanceof TokenExpiredError) {
            return next(new AuthError({
                name: 'TokenExpired',
                message: 'The token has expired',
                type: 'InvalidToken',
                code: 6
            }));
        } else if (error instanceof JsonWebTokenError) {
            return next(new AuthError({
                name: 'InvalidJWT',
                message: 'The JWT format was invalid or the token is otherwise invalid',
                type: 'InvalidToken',
                code: 3
            }));
        }
        next(error);
    }
}
export async function requestMailVerification(req, res, next) {
    try {
        const { mail } = req.params
        if (!mail) {
            throw new Error("You need to send a mail")
        }
        let token = mailValidationStore.request(mail)
        res.status(200).json({token})
    } catch (error) {
        next(error)
    }
}

export async function validateVerificationCode(req, res, next) {
    try {
        const { code, token } = req.body;

        if (!code || !token) {
            return res.status(400).json({ error: 'Código o token faltante' });
        }

        // Verifica el token (el token fue generado en el método `request`)
        const decodedData = jwt.verify(token, process.env.SECRET_KEY);
        let verifiedToken=mailValidationStore.validate(decodedData)
        if(verifiedToken){
            res.status(200).json({token})
        }
        throw new Error("Validation failed")
    } catch (error) {
        next(error)
    }
}

/*
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
        if(!tokensdb){
            throw new AuthError({
                name: "userNotFound",
                message: "The token belongs to an user that not longer exist",
                type: "InexistentUser",
                code: 5
            });
        }
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
}*/
