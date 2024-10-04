import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
const PORT = process.env.PORT ?? "3000";
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 } from 'uuid';
import { AuthError } from './errorsHandler/AuthError.class.js';
import { compare } from 'bcrypt'
import jwt from 'jsonwebtoken';
const { sign, JsonWebTokenError, verify } = jwt
import { SessionError } from './errorsHandler/SessionError.class.js';
import { authTokenMdwr } from './midlewares/apiAuth.mdwr.js';
import { authService } from './services/auth.services.js';
import { hasTokenExpired } from './tools/tokenExpired.js';
import refresher from './tools/refreshTokens.js';
import { socketAuth } from './midlewares/socketAuth.mdwr.js';
import { Storage } from './virtualdata/virtualStorage.js';
import { UserServices } from './services/user.services.js';
import { Icons } from './tools/IconGenerator.js';
import { configDotenv } from 'dotenv';
import { errorHandlerMdwr } from './midlewares/apiErrorHandler.mdwr.js';
import prisma from '../prisma/postgresClient.js';
configDotenv()
const app = express();
const server = createServer(app);
const io = new Server(server);
app.use(express.json())
app.use(morgan('combined'));
app.use(cors());
// Log de conexión
io.use(socketAuth)
io.on('connection', (socket) => {
    socket.on('createSession', async (data) => {
        try {
            const ID = socket.data?.ID
            const { name, type, source: { platform, url, time } } = data
            const sessionID = v4()
            if (type === 'registered') {
                const user = await UserServices.getUserById(ID)
                if (user) {
                    Storage.createSession({
                        ID: sessionID,
                        io: io,
                        owner: {
                            socket,
                            ID,
                            isPremium: user.isPremium,
                            name: user.name,
                            icon: { style: user.iconStyle, seed: user.seed }
                        },
                        source: {
                            platform,
                            url,
                            time
                        }
                    })
                }
            } else if (type === 'guest') {
                let guestID = v4()
                Storage.createSession({
                    ID: sessionID,
                    io: io,
                    owner: {
                        socket,
                        ID: guestID,
                        isPremium: false,
                        name: name,
                        icon: { style: 'botttsNeutral', seed: Icons.seed() }
                    },
                    source: {
                        platform,
                        url
                    }
                })
                socket.data.ID = guestID
            }
            socket.data.sessionID = sessionID
        } catch (error) {
            socket.emit('error', error)
            socket.disconnect(true)
        }
    });
    socket.on('joinSession', async ({ user: { type, name }, sessionID }) => {
        try {
            const ID = socket.data.ID
            const Session = Storage.findByID(sessionID)
            if (!Session) {
                throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
            }
            if (type === 'registered') {
                const user = await UserServices.getUserById(ID)
                Session.addUser({ userID: user.id, name: user.name, icon: { style: user.iconStyle, seed: user.icon }, type, socket })
            } else if (type === 'guest') {
                let guestID = v4()
                Session.addUser({ userID: guestID, name, type, icon: { style: 'botttsNeutral', seed: Icons.seed() }, socket })
                socket.data.ID = guestID
            }
            socket.data.sessionID = sessionID
        } catch (error) {
            socket.emit('error', error)
            socket.disconnect(true)
            if (error instanceof SessionError || error instanceof AuthError) {
                error.log()
            }
        }
    })
    socket.on('changeSource', ({ sessionID, source: { platform, url } }) => {
        try {
            const session = Storage.findByID(sessionID)
            if (!session) {
                throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
            }
            session.changeSource({ platform, url })
        } catch (error) {
            if (error instanceof SessionError || error instanceof AuthError) {
                error.log()
            }
        }
    })
    socket.on('changeSourceTime', ({ sessionID, t }) => {
        try {
            const userID = socket.data.ID
            const Session = Storage.findByID(sessionID)
            if (!Session) {
                throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
            }
            Session.changeSourceTime({ t, userID })
        } catch (error) {
            if (error instanceof SessionError || error instanceof AuthError) {
                error.log()
            }
        }
    })
    socket.on('pauseSource', ({ sessionID, pausedAt }) => {
        try {
            const userID = socket.data.ID
            const Session = Storage.findByID(sessionID)
            if (!Session) {
                throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
            }
            Session.pause({ userID, pausedAt })
        } catch (error) {
            if (error instanceof SessionError || error instanceof AuthError) {
                error.log()
            }
        }
    })
    socket.on('playSource', ({ sessionID, playedAt }) => {
        try {
            const userID = socket.data.ID
            const Session = Storage.findByID(sessionID)
            if (!Session) {
                throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
            }
            Session.play({ userID, playedAt })
        } catch (error) {
            if (error instanceof SessionError || error instanceof AuthError) {
                error.log()
            }
        }
    })
    socket.on('kickUser', ({ sessionID, kick }) => {
        try {
            const userID = socket.data.ID
            const Session = Storage.findByID(sessionID)
            if (!Session) {
                throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
            }
            if (Session.owner.ID === userID) {
                Session.kickUser({ userID, kick })
            } else {
                throw SessionError({ name: 'AuthorizationFailed', message: 'You are not allowed to kick users', type: 'unauthorized', where: 'whileKicking' })
            }
        } catch (error) {
            if (error instanceof SessionError || error instanceof AuthError) {
                error.log()
            }
        }
    })
    socket.on('disconnect', () => {
        try {
            const userID = socket.data.ID
            const sessionID = socket.data.sessionID
            socket.leave(sessionID)
            io.to(sessionID).emit('userDisconnection', userID)
            const Session = Storage.findByID(sessionID)
            const user = Session.findUser(userID)
            user.removeUserTimeout = setTimeout(() => {
                user.remove()
                user.socket.leave(sessionID)
                Session.users.delete(user)
            }, 480000)
        } catch (error) {
            if (error instanceof SessionError || error instanceof AuthError) {
                error.log()
            }
        }
    });
    socket.on('reconnect', async () => {
        try {
            if (socket.recovered) {
                const data = socket.data
                const Session = Storage.findByID(data.sessionID)
                const user = Session.findUser(data.ID)
                if (user) {
                    clearTimeout(user.removeUserTimeout)
                    user.socket = socket
                    user.join()
                } else {
                    const context = await socket.timeout(60000).emitWithAck('context', null)
                    /*si el usuario ya fue borrado de la virtualdata, ejecutamos el metodo para agregar el usuario
                    con la informacion del contexto solicitado al cliente mediante la conexion socket */
                    Session.addUser({ userID: context.ID, name: context.name, type: 'guest', icon: context.icon, socket })
                }
            } else {
                const context = await socket.timeout(60000).emitWithAck('context', null)
                /*si no se puedo recuperar la coexion y la data, ejecutamos el metodo para agregar el usuario
                 con la informacion del contexto solicitado al cliente mediante la conexion socket */
                Session.addUser({ userID: context.ID, name: context.name, type: 'guest', icon: context.icon, socket })
            }
        } catch (error) {
            if (socket.connected) {
                socket.emit('error', error)
                socket.disconnect(true)
            }
            if (error instanceof SessionError || error instanceof AuthError) {
                error.log()
            }
        }
    })
});
app.get('/', async (req, res) => {
    res.json(await prisma.auth.findMany())
})
app.post("/api/auth/signup", async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        // Validación de los datos de entrada
        if (!email || !password || !name) {
            throw new AuthError({
                name: "MissingData",
                message: "Email, password, and name are required",
                type: "InvalidData",
                code: 5,
            });
        }
        // Verificar si el usuario ya existe
        const existingUser = await UserServices.getUserByMail(email);
        if (existingUser) {
            throw new AuthError({
                name: "UserExists",
                message: "User with this email already exists",
                type: "InvalidData",
                code: 6,
            });
        }
        const user = await UserServices.createUser({ email, password, name });
        const accesToken = sign({ ID: user.id, type: 'access' }, process.env.SECRET_KEY, { expiresIn: '2d' })
        const refreshToken = sign({ ID: user.id, type: 'refresh' }, process.env.SECRET_KEY, { expiresIn: '4d' })
        // Generar los tokens
        const tokens = {
            accesToken: accesToken,
            refreshToken: refreshToken,
        };
        authService.setUserTokens(user.id, tokens)
        res.status(201).json({
            user: {
                name: user.name,
                icon: Icons.genIcons(user.iconStyle, user.icon),
                id: user.id,
                isPremium: user.isPremium,
            },
            tokens,
        });
    } catch (error) {
        next(error);
    }
})
app.post("/api/auth/signin", async (req, res, next) => {
    try {
        const { email, password } = req.body;
        console.log(req.body);
        
        // Validación de email y password
        if (!email || !password) {
            throw new AuthError({
                name: "MissingData",
                message: "Email & Password must be provided in the body of the request",
                type: 'InvalidData',
                code: 4
            });
        }
        if(email.length < 4||email.length > 44){
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
                accesToken: sign({ ID: user.id, type: 'acces' }, process.env.SECRET_KEY, { expiresIn: '2d' }),
                refreshToken: refreshExpired ? sign({ ID: user.id, type: 'refresh' }, process.env.SECRET_KEY, { expiresIn: '4d' }) : auth.refreshToken
            };
            authService.setUserTokens(user.id, tokens);
            res.status(200).json({
                user: {
                    name: user.name,
                    icon: Icons.genIcons(user.iconStyle, user.icon),
                    id: user.id,
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
});
app.get("/api/auth/me", authTokenMdwr, async (req, res, next) => {
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
        res.status(200).json({ name: user.name, icon: Icons.genIcons(user.iconStyle, user.icon), id: user.id, isPremium: user.isPremium })
    } catch (error) {
        next(error)
    }
})
app.get("/api/auth/me/renew", async (req, res, next) => {
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
})
app.use(errorHandlerMdwr)
server.listen(PORT, () => {
    console.log('Servidor escuchando en el puerto ' + PORT);
});
