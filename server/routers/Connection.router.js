import express from "express";
import { authTokenMdwr } from "../middlewares/apiAuth.mdwr.js";
import AuthValidations from "../validations/auth.validations.service.js";
import ConnectionValidations from "../validations/connection.validation.service.js";
import { UserServices } from "../services/user.services.js";
import { Storage } from "../virtualdata/virtualStorage.js";
import connectionSigner from "../tools/connection.signer.js";
import { v4 } from "uuid";
import { Icons } from "../tools/IconGenerator.js";
const ConnectionRouter = express.Router();
export default function initConnectionsRouter(io) {
    ConnectionRouter.post('/api/session/party/start', AuthValidations.authToken, authTokenMdwr, ConnectionValidations.startParty, async (req, res, next) => {
        try {
            const userId = req.tokenPayload.ID
            console.log('user id',userId)
            const { source: { platform, url, time } } = req.body
            const user = await UserServices.getUserById(userId)
            const sessionId = v4()
            if (user) {
                const session = Storage.createSession({
                    id: sessionId,
                    io: io,
                    owner: {
                        id: userId
                    },
                    source: {
                        platform,
                        url,
                        time
                    }
                })
                const connectionToken = session.addUser({
                    owner:true,
                    id:userId,
                    isPremium: user.isPremium,
                    name: user.name,
                    icon: { style: user.iconStyle, seed: user.icon },
                    type: 'registered'
                })
                res.status(200).json({ token: connectionToken, session: session.getData() })
            } else {
                res.status(404).json({ error: { name: 'InexistentUser', message: 'seems like this user was deleted or suspended.' } })
            }
        } catch (error) {
            next(error)
        }
    })
    ConnectionRouter.post('/api/session/party/start/guest', ConnectionValidations.startGuestParty, async (req, res, next) => {
        try {
            const userId = v4()
            const { name, source: { platform, url, time } } = req.body
            const sessionId = v4()
            const icons = Icons.genRandomIcon()
            const session = Storage.createSession({
                id: sessionId,
                io: io,
                owner: {
                    id: userId
                },
                source: {
                    platform,
                    url,
                    time
                }
            })
            const connectionToken = session.addUser({
                id: userId,
                isPremium: false,
                name: name,
                icon: icons,
                type: 'guest'
            })
            res.status(200).json({ token: connectionToken, session: session.getData(), user: session.findUser(userId).builtData() })
        } catch (error) {
            next(error)
        }
    })
    return ConnectionRouter
}