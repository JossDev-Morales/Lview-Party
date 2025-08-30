import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 } from 'uuid';
import { AuthError } from './errorsHandler/AuthError.class.js';
import { SessionError } from './errorsHandler/SessionError.class.js';
import { socketAuth } from './midlewares/socketAuth.mdwr.js';
import { Storage } from './virtualdata/virtualStorage.js';
import { UserServices } from './services/user.services.js';
import { Icons } from './tools/IconGenerator.js';
import { configDotenv } from 'dotenv';
import { errorHandlerMdwr } from './midlewares/apiErrorHandler.mdwr.js';
import path from 'path';
import AuthRouter from './routers/Auth.router.js';
import initConnectionsRouter from './routers/Connection.router.js';
import UserRouter from './routers/User.router.js';
import { __dirname } from './tools/filesData.js';
configDotenv()
const PORT = process.env.PORT ?? "3000";
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite todas las conexiones. Si prefieres limitar a ciertos dominios, puedes reemplazar '*' con una lista de dominios.
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"], // Puedes ajustar los headers permitidos según sea necesario
        credentials: true, // Habilita el intercambio de cookies si es necesario
    },
    connectionStateRecovery: {
        skipMiddlewares: true,
        maxDisconnectionDuration: (1000 * 60) * 2
    }
});
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(morgan('combined'));
app.use(cors({
    origin: [
      "chrome-extension://mbahalmfdfjdfhdeckclkfpnfebdpghe",  // Permitir la extensión
      "https://lview-party.onrender.com",  // Permitir el frontend en producción (si aplica)
      "http://127.0.0.1:5500",
      "https://www.youtube.com",
      "https://www.netflix.com"
    ],
    credentials: true
  }));
// Log de conexión
io.use(socketAuth)
// session
io.on('connection', async (socket) => {
    try {
        console.log("connection accepted", socket.id);
        if (socket.recovered) {
            if (!socket.data || (!socket.data.ID || !socket.data.sessionID)) {
                throw new AuthError({ name: "NotRecoveredData", message: 'This connection sucessfully recovered but not enough data is founded for reconnection', code: 21, type: 'RecoveringFailed' })
            }
            let { ID, sessionID } = socket.data
            let session = Storage.findByID(sessionID)
            let user = session.findUser(ID)
            console.log('Connection ' + socket.id + ' sucessfully recovered for the user ' + user.ID + ' with name: ' + user.name)
            clearTimeout(user.removeTimer)
        }
        socket.on('sessionCheking', async ({ user: { ID, type, name, owner }, state: { inSession, sessionID } }) => {
            try {

                if (inSession && !socket.recovered) {
                    console.log('check')
                    let session = Storage.findByID(sessionID)
                    if (!session) {
                        let err = new SessionError({ name: 'unrecoveredSession', message: 'The session was closed for a connection interruption', type: 'recover', where: 'recoveringConnection' })
                        console.log('left')
                        socket.emit('error', err.build())
                        socket.data.inSession = false
                        socket.emit('left', 'Session closed')
                        throw err
                    }
                    console.log('type', type, "guest", type === "guest")
                    if (type === "guest") {
                        console.log('in guest')
                        session.addUser({
                            ID,
                            name,
                            owner,
                            sessionID,
                            type,
                            socket,
                            icon: Icons.genRandomIcon()
                        })
                    } else if (type === 'registered') {
                        let user = await UserServices.getUserById(ID)
                        session.addUser({
                            ID,
                            type,
                            name,
                            owner,
                            sessionID,
                            socket,
                            isPremium: user.isPremium,
                            icon: {
                                seed: user.icon,
                                style: user.iconStyle
                            }
                        })
                    }
                    socket.data.ID = ID
                    socket.data.sessionID = sessionID
                }
            } catch (error) {
                socket.emit('error', error)
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
            }
        })
        //TODO agregar validacion inSession a usuarios de tipo registered
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
                                icon: { style: user.iconStyle, seed: user.icon },
                                type
                            },
                            source: {
                                platform,
                                url,
                                time
                            }
                        })
                    }
                } else if (type === 'guest') {
                    Storage.createSession({
                        ID: sessionID,
                        io: io,
                        owner: {
                            socket,
                            ID,
                            isPremium: false,
                            name: name,
                            icon: Icons.genRandomIcon(),
                            type
                        },
                        source: {
                            platform,
                            url
                        }
                    })
                }
                console.log('creation', sessionID);
                socket.data.name = name
                socket.data.inSession = true
                socket.data.sessionID = sessionID
            } catch (error) {
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
                socket.emit('error', error)
                socket.disconnect(true)
            }
        });
        // user
        socket.on('joinSession', async ({ user: { type, name }, sessionID }) => {
            try {
                const ID = socket.data.ID
                const Session = Storage.findByID(sessionID)
                if (!Session) {
                    throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
                }
                if (type === 'registered') {
                    const user = await UserServices.getUserById(ID)
                    socket.data.name = user.name
                    Session.addUser({ sessionID, ID: user.id, name: user.name, icon: { style: user.iconStyle, seed: user.icon }, type, socket, isPremium: user.isPremium })
                } else if (type === 'guest') {
                    Session.addUser({ sessionID, ID, name, type, icon: { style: 'botttsNeutral', seed: Icons.seed() }, socket })
                    socket.data.name = name
                }
                socket.data.inSession = true
                socket.data.sessionID = sessionID
            } catch (error) {
                socket.emit('error', error)
                socket.disconnect(true)
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
                socket.emit('error', error)
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
            }
        })
        // chat
        socket.on('sendMessage', (data) => {
            console.log(data)
            try {
                const { sessionID, message } = data
                const ID = socket.data.ID
                const Session = Storage.findByID(sessionID)
                if (!Session) {
                    throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
                }
                Session.sendMessage({ content: message, userID: ID })
            } catch (error) {
                socket.emit('error', error)
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
            }
        })
        socket.on('reactToMessage', (data) => {
            try {
                const { sessionId, message: { messageId, contentId }, reaction } = data
                const ID = socket.data.ID
                const Session = Storage.findByID(sessionId)
                if (!Session) {
                    throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionId} does not exist`, type: 'session', where: 'FindingSession' })
                }
                const build = Session.chat.getMessage(messageId).getContent(contentId).reactions.add({ ...reaction, userId: ID })
                const user = Session.findUser(ID)
                const payload = { messageId, contentId, data: build }
                user.emit('reaction', payload)
                user.emitToMyself('reaction', payload)
            } catch (error) {
                socket.emit('error', error)
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
            }
        })
        socket.on('unreactToMessage', (data) => {
            try {
                const { sessionId, message: { messageId, contentId }, reactionId } = data
                const ID = socket.data.ID
                const Session = Storage.findByID(sessionId)
                if (!Session) {
                    throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionId} does not exist`, type: 'session', where: 'FindingSession' })
                }
                const count = Session.chat.getMessage(messageId).getContent(contentId).reactions.remove(reactionId)
                const user = Session.findUser(ID)
                const payload = { messageId, contentId, reactionId, count }
                user.emit('unreact', payload)
                user.emitToMyself('unreact', payload)
            } catch (error) {
                socket.emit('error', error)
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
            }
        })
        socket.on('removeMessage', (data) => {
            try {
                const { sessionId, contentId, messageId } = data
                let Session = Storage.findByID(sessionId)
                let chat = Session.chat
                let message = chat.getMessage(messageId)
                let userId = message.context.userID
                let content = message.getContent(contentId)
                let { removeParent, removeChilds } = message.removeOne(contentId)
                if (content.refs.by.length > 0) {
                    content.refs.by.forEach(ref => {
                        chat.getMessage(ref.message).getContent(ref.content).refs.to = undefined
                    })
                    data.removeRefs = content.refs.by
                }
                content.remove()
                if (removeChilds.length > 0) {
                    removeChilds.forEach(child => {
                        message.removeOne(child)
                    })
                    data.removeChilds = removeChilds
                }
                if (removeParent) {
                    message.remove()
                    chat.removeMessage(messageId)
                    data.removeParent = true
                }
                let user = Session.findUser(userId)
                user.emitToMyself('messageRemoved', data)
                user.emit('messageRemoved', data)
            } catch (error) {
                socket.emit('error', error)
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
            }
        })
        socket.on('editMessage', (data) => {
            try {
                const { sessionId, messageId, content } = data
                const Session = Storage.findByID(sessionId)
                if (!Session) {
                    throw new SessionError({ name: 'SessionNotFound', message: `The Session with ID ${sessionID} does not exist`, type: 'session', where: 'FindingSession' })
                }
                Session.chat.getMessage(messageId).edit(content.id, content.body)
                socket.emit('messageEdited', { messageId, contentId: content.id, edition: {} })
            } catch (error) {
                socket.emit('error', error)
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
            }
        })
        // source
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

        socket.on('disconnect', () => {
            console.log("user disconnected", socket.data.ID);
            try {
                if (socket.data.inSession) {
                    const userID = socket.data.ID
                    const sessionID = socket.data.sessionID
                    const Session = Storage.findByID(sessionID)
                    if (Session) {
                        const removeTimer = setTimeout(() => {
                            console.log('removing', userID)
                            Session.removeUser(userID);
                            io.to(sessionID).emit('userRemoving', userID)
                        }, (1000 * 60) * 2)
                        let user = Session.findUser(userID)
                        user.removeTimer = removeTimer
                        Session.sendNotification({ context: { userID }, message: 'disconnected' })
                    }
                }
            } catch (error) {
                if (error instanceof SessionError || error instanceof AuthError) {
                    error.log()
                }
            }
        });

    } catch (error) {
        console.log('Error at connection', error)
        socket.disconnect(true)
    }
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
const distPath = path.resolve(__dirname, '../../client/dist')

app.use(express.static(distPath))

app.use(AuthRouter)
app.use(UserRouter({io}))
app.use(initConnectionsRouter(io))
app.use(errorHandlerMdwr)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})
import fs from 'fs'

console.log('Checking distPath:', distPath)
console.log('index.html exists:', fs.existsSync(path.join(distPath, 'index.html')))
server.listen(PORT, () => {
    console.log('Servidor escuchando en el puerto ' + PORT);
});
