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
import { errors } from "celebrate"
import OTPStore from '../virtualdata/mailValidationStore.js'
import { signUpMail } from "../services/mailer.services.js";
const { JsonWebTokenError, sign, verify } = jwt
const AuthRouter = express.Router();
AuthRouter.post('/', async (req, res) => {
    res.json(await prisma.auth.findMany())
})
AuthRouter.post("/api/auth/signup", AuthValidations.signupValidation, async (req, res, next) => {
    try {
        const { email, password, name, token } = req.body;
        if (!token) {
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
        if (!decoded.verifiedAt) {
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
                name: "UserValidation",
                message: "User with this email already exists",
                type: "InvalidData",
                code: 6,
            });
        }
        const user = await UserServices.createUser({ email: email.toLowerCase(), password, name });
        const accesToken = sign({ ID: user.id, type: 'access' }, process.env.SECRET_KEY, { expiresIn: '2d' })
        const refreshToken = sign({ ID: user.id, type: 'refresh' }, process.env.SECRET_KEY, { expiresIn: '4d' })
        // Generar los tokens
        const tokens = {
            accesToken: accesToken,
            refreshToken: refreshToken,
        };
        authService.setUserTokens(user.id, tokens)
        signUpMail(email.toLowerCase(), name)
        res.status(201).json({
            user: {
                name: user.name,
                icon: Icons.genIcons(user.iconStyle, user.icon),
                id: user.id,
                subscriptionType: user.subscriptionType,
                inSession: user.inSession,
                isPremium: user.isPremium,
                color: user.color
            },
            tokens,
        });
    } catch (error) {
        next(error);
    }
}, errors)
AuthRouter.post("/api/auth/signin", AuthValidations.signinValidation, async (req, res, next) => {
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
                code: 9
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
                    isPremium: user.isPremium,
                    color: user.color
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
                        isPremium: user.isPremium,
                        color: user.color
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
                    isPremium: user.isPremium,
                    color: user.color
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
}, errors);
AuthRouter.get("/api/auth/me", AuthValidations.authToken, authTokenMdwr, async (req, res, next) => {
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
            inSession: user.inSession, isPremium: user.isPremium,
            color: user.color
        })
    } catch (error) {
        next(error)
    }
}, errors)
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
}, errors)
//servicio de seguridad y recovery

AuthRouter.post("/api/auth/recovery/request", async (req, res, next) => {
    try {
        const { mail } = req.body
        if (!mail) {
            throw new AuthError({
                name: "MissingData",
                message: "Email is requiered",
                type: "InvalidData",
                code: 5,
            });
        }
        const existingUser = await UserServices.getUserByMail(mail.toLowerCase());
        if (!existingUser) {
            throw new AuthError({
                name: "UserValidation",
                message: "User with this email doesn't exist",
                type: "InvalidData",
                code: 6,
            });
        }
        let token = OTPStore.request(mail)
        res.status(200).json({ token })
    } catch (error) {
        next(error)
    }
})
AuthRouter.post("/api/auth/recovery/verification", async (req, res, next) => {
    try {
        const { code, token } = req.body;

        if (!code || !token) {
            return res.status(400).json({ error: 'Código o token faltante' });
        }

        // Verifica el token (el token fue generado en el método `request`)
        const decodedData = jwt.verify(token, process.env.SECRET_KEY);
        let verifiedToken = OTPStore.validate(decodedData.id, code)
        if (verifiedToken) {
            res.status(200).json({ token: verifiedToken })
        } else {
            throw new Error("Validation failed")
        }
    } catch (error) {
        next(error)
    }
})
AuthRouter.post("/api/auth/recovery/reset", async (req, res, next) => {
    try {
        const { password, token } = req.body;

        if (!password || !token) {
            return res.status(400).json({ error: 'Password o token faltante' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        // Comparar correos en minúsculas por seguridad
        if (!decoded.otp) {
            throw new AuthError({
                name: "InvalidMailToken",
                message: "This is not a mail verification token",
                type: "InvalidToken",
                code: 8,
            });
        }
        let user = await UserServices.getUserByMail(decoded.mail)
        authService.updatePassword(user.id, password)
        res.status(200).send()
    } catch (error) {
        next(error)
    }
})
// servicio de validacion de mails
AuthRouter.get("/api/auth/verifier/mail/exist", async (req, res, next) => {
    try {
        const { mail } = req.query
        if (!mail) {
            throw new AuthError({
                name: "MissingData",
                message: "Email is requiered",
                type: "InvalidData",
                code: 5,
            });
        }
        const existingUser = await UserServices.getUserByMail(mail.toLowerCase());
        if (existingUser) {
            throw new AuthError({
                name: "UserExists",
                message: "User with this email already exists",
                type: "InvalidData",
                code: 6,
            });
        }
        res.sendStatus(200)
    } catch (error) {
        next(error)
    }
})
AuthRouter.post("/api/auth/verifier/mail/request", requestMailVerification)
AuthRouter.post("/api/auth/verifier/mail/validate", validateVerificationCode)
export default AuthRouter