import express from "express";
import { AuthError } from "../errorsHandler/AuthError.class.js";
import { UserServices } from "../services/user.services.js";
import jwt from "jsonwebtoken";
import { authService } from "../services/auth.services.js";
import { Icons } from "../tools/IconGenerator.js";
import { hasTokenExpired } from "../tools/tokenExpired.js";
import refresher from "../tools/refreshTokens.js";
import { authTokenMdwr, requestMailVerification, validateVerificationCode } from "../midlewares/apiAuth.mdwr.js";
import prisma from "../../prisma/postgresClient.js";
import { compare } from "bcrypt";
import AuthValidations from "../validations/auth.validations.service.js";
import {errors} from "celebrate"
import { signUpMail } from "../services/mailer.services.js";
const { JsonWebTokenError, sign, verify } = jwt
const AuthRouter = express.Router();
AuthRouter.post('/', async (req, res) => {
    res.json(await prisma.auth.findMany())
})
AuthRouter.post("/api/auth/signup", AuthValidations.signupValidation ,async (req, res, next) => {
    try {
        const { email, password, name, token } = req.body;
        if(!token){
            throw new AuthError({
                name: "MissingData",
                message: "You need to provide a mailValidationToken at the token key to ensure the mail was verified",
                type: "InvalidData",
                code: 5,
            });
        }
        // Validación de los datos de entrada
        if (!email || !password || !name) {
            throw new AuthError({
                name: "MissingData",
                message: "Email, password, and name are required",
                type: "InvalidData",
                code: 5,
            });
        }
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        // Comparar correos en minúsculas por seguridad
        if(!decoded.verifiedAt){
            throw new AuthError({
                name: "InvalidMailToken",
                message: "This is not a mail verification token",
                type: "InvalidToken",
                code: 8,
            });
        }
        if (decoded.mail.toLowerCase() !== email.toLowerCase()) {
            throw new AuthError({
                name: "InvalidMailToken",
                message: "This mail token doesn't verify the signup mail",
                type: "InvalidToken",
                code: 8,
            });
        }
        // Verificar si el usuario ya existe
        const existingUser = await UserServices.getUserByMail(email.toLowerCase());
        if (existingUser) {
            throw new AuthError({
                name: "UserExists",
                message: "User with this email already exists",
                type: "InvalidData",
                code: 6,
            });
        }
        const user = await UserServices.createUser({ email:email.toLowerCase(), password, name });
        const accesToken = sign({ ID: user.id, type: 'access' }, process.env.SECRET_KEY, { expiresIn: '2d' })
        const refreshToken = sign({ ID: user.id, type: 'refresh' }, process.env.SECRET_KEY, { expiresIn: '4d' })
        // Generar los tokens
        const tokens = {
            accesToken: accesToken,
            refreshToken: refreshToken,
        };
        authService.setUserTokens(user.id, tokens)
        signUpMail(email.toLowerCase(),name)
        res.status(201).json({
            user: {
                name: user.name,
                icon: Icons.genIcons(user.iconStyle, user.icon),
                id: user.id,
                subscriptionType: user.subscriptionType,
                inSession: user.inSession,
                isPremium: user.isPremium,
            },
            tokens,
        });
    } catch (error) {
        next(error);
    }
},errors)
AuthRouter.post("/api/auth/signin", AuthValidations.signinValidation ,async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // Validación de email y password
        if (!email || !password) {
            throw new AuthError({
                name: "MissingData",
                message: "Email & Password must be provided in the body of the request",
                type: 'InvalidData',
                code: 4
            });
        }
        if (email.length < 4) {
            throw new AuthError({
                name: "MissingData",
                message: "Email & Password are not in a valid format",
                type: 'InvalidData',
                code: 8
            });
        }
        const auth = await authService.getAuthByMail(email);
        if (!auth) {
            throw new AuthError({
                name: "InexistentUser",
                message: "The provided email does'nt belong to an existent user",
                type: 'InexistentMail',
                code: 5
            });
        }
        // Verificación de contraseña
        if (!(await compare(password, auth.password))) {
            throw new AuthError({
                name: "InvalidCredentials",
                message: "Invalid password",
                type: "AuthError",
                code: 6
            });
        }
        const user = await UserServices.getUserByMail(email);
        // Función para crear tokens y responder
        const generateAndRespondWithTokens = (user, refreshExpired = false) => {
            const tokens = {
                accesToken: sign({ ID: user.id, type: 'access' }, process.env.SECRET_KEY, { expiresIn: '2d' }),
                refreshToken: refreshExpired ? sign({ ID: user.id, type: 'refresh' }, process.env.SECRET_KEY, { expiresIn: '4d' }) : auth.refreshToken
            };
            authService.setUserTokens(user.id, tokens);
            res.status(200).json({
                user: {
                    name: user.name,
                    icon: Icons.genIcons(user.iconStyle, user.icon),
                    id: user.id,
                    subscriptionType: user.subscriptionType,
                    inSession: user.inSession,
                    isPremium: user.isPremium
                },
                tokens
            });
        };

        // Token handling
        if (!auth.accesToken || hasTokenExpired(auth.accesToken)) {
            if (!auth.refreshToken || hasTokenExpired(auth.refreshToken)) {
                // Ambos tokens han expirado, generar nuevos
                generateAndRespondWithTokens(user, true);
            } else {
                // Acces token ha expirado pero refresh token es válido
                const tokens = refresher(auth.refreshToken);
                authService.setUserTokens(user.id, tokens);
                res.status(200).json({
                    user: {
                        name: user.name,
                        icon: Icons.genIcons(user.iconStyle, user.icon),
                        id: user.id,
                        subscriptionType: user.subscriptionType,
                        inSession: user.inSession,
                        isPremium: user.isPremium
                    },
                    tokens
                });
            }
        } else {
            // Token de acceso válido, devolver tokens actuales
            res.status(200).json({
                user: {
                    name: user.name,
                    icon: Icons.genIcons(user.iconStyle, user.icon),
                    id: user.id,
                    subscriptionType: user.subscriptionType,
                    inSession: user.inSession,
                    isPremium: user.isPremium
                },
                tokens: {
                    accesToken: auth.accesToken,
                    refreshToken: auth.refreshToken
                }
            });
        }
    } catch (error) {
        next(error);
    }
},errors);
AuthRouter.get("/api/auth/me", AuthValidations.authToken ,authTokenMdwr, async (req, res, next) => {
    try {
        const userID = req.tokenPayload.ID
        const user = await UserServices.getUserById(userID)
        if (!user) {
            throw new AuthError({
                name: "userNotFound",
                message: "The token belongs to an user that not longer exist",
                type: "InexistentUser",
                code: 5
            });
        }
        res.status(200).json({
            name: user.name, icon: Icons.genIcons(user.iconStyle, user.icon), id: user.id, subscriptionType: user.subscriptionType,
            inSession: user.inSession, isPremium: user.isPremium
        })
    } catch (error) {
        next(error)
    }
},errors)
AuthRouter.get("/api/auth/me/renew", AuthValidations.authToken, async (req, res, next) => {
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
        const tokenData = verify(token, process.env.SECRET_KEY);
        if (tokenData) {
            const currentToken = await authService.getTokensByUser(tokenData.ID);
            const user = await UserServices.getUserById(tokenData.ID)
            res.json({
                token: currentToken.accesToken,
                user: {
                    name: user.name,
                    icon: Icons.genIcons(user.iconStyle, user.icon),
                    id: user.id,
                    subscriptionType: user.subscriptionType,
                    inSession: user.inSession,
                    isPremium: user.isPremium,
                }
            })
        } else {
            next(new AuthError({
                name: 'InvalidJWT',
                message: 'The JWT format was invalid or the token is otherwise invalid',
                type: 'InvalidToken',
                code: 3
            }));
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
        }
        next(error)
    }
},errors)

// servicio de validacion de mails
AuthRouter.post("/api/auth/verifier/mail/request",requestMailVerification)
AuthRouter.post("/api/auth/verifier/mail/validate",validateVerificationCode)
export default AuthRouter