import { AuthError } from "../errorsHandler/AuthError.class.js"
import signer from '../tools/connection.signer.js'
import { Storage } from "../virtualdata/virtualStorage.js"
export default async function AuthConnection(socket,context,next) {
    try {
        const {token} = socket.handshake.auth
        if(!token){
            next(new AuthError({name:'MissingToken', message:'The token was not received',type:'ConnectionRejected',code:30}))
        }
        const { owner, connectionId, sessionId } = signer.verifyConnection(token)
        console.log(sessionId)
        let Session=Storage.findById(sessionId)
        console.log(Session)
        console.log(owner)
        let User=Session.findUser(owner)
        console.log(User)
        if (!User) {
            next(new AuthError({name:'UserNotAccepted',message:'This user is not longer available at this party session.',type:'ConnectionRejected',code:30}))
            return;
        }
        if (User.connectionId!==connectionId) {
            next(new AuthError({name:'OldTokenConnection',message:'This token connection is not the latest signed token for this connection.',type:'ConnectionRejected',code:30}))
            return;
        }    
        next()
    } catch (error) {
        next(error)
        console.error('error at auth connection: ',error)
    }
}