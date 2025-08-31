import AuthConnection from "./AuthConnection.js"
import eventsInit from "./Events.init.js"
import useMiddlewares from "./useMiddlewares.js"

export default function initSocketConnection(io) {
    io.on('connection', (socket) => {
        useMiddlewares(socket, 'connection', {}, AuthConnection, eventsInit, (err, socket, ctx, next) => {
            //error handler ligero
            if (err.code === 30) {
                socket.emit('error', err)
                socket.disconnect()
            }
            console.error(err)
        })
    })
}