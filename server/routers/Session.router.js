import express from "express";
import { AuthError } from "../errorsHandler/AuthError.class";
import connectionSigner from "../tools/connection.signer";
import { Storage } from "../virtualdata/virtualStorage";
const SessionRouter = express.Router()
SessionRouter.post('/api/session/activity/touch', (req, res, next) => {
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
            next(new AuthError({ name: 'MissingToken', message: 'The token was not received', type: 'ConnectionRejected', code: 30 }))
        }
        const { owner, connectionId, sessionId } = connectionSigner.verifyConnection(token)
        let Session = Storage.findById(sessionId)
        if (!Session) {
            next(new AuthError({ name: 'SessionNotFound', message: 'This party seems that does not longer exist.', type: 'ConnectionRejected', code: 30 }))
            return;
        }
        let User = Session.findUser(owner)
        if (!User) {
            next(new AuthError({ name: 'UserNotAccepted', message: 'This user is not longer available at this party session.', type: 'ConnectionRejected', code: 30 }))
            return;
        }
        if (User.connectionId !== connectionId) {
            next(new AuthError({ name: 'OldTokenConnection', message: 'This token connection is not the latest signed token for this connection.', type: 'ConnectionRejected', code: 30 }))
            return;
        }
        User.activity.touch()
        res.sendStatus(200)
    } catch (error) {
        next(error)
    }
})
export default SessionRouter