import { Socket } from "socket.io"
import { SessionError } from "../errorsHandler/SessionError.class"

/**
 * 
 * @param {Socket} socket 
 * @param {string} eventName 
 * @param {any} context 
 * @param  {...Function} middlewares 
 */
export default async function useMiddlewares(socket, eventName, context, ...middlewares) {


    try {
        const chain = middlewares.filter(mdw => mdw.length === 3)  // middleware normal
        const errorChain = middlewares.filter(mdw => mdw.length === 4)  // middleware de error

        let inChain = true
        let originalError
        let i = 0

        const next = async (error) => {
            if (error && inChain) {
                inChain = false
                originalError = error
                i = 0
            }

            if (inChain) {
                if (i >= chain.length) return
                const current = chain[i++]
                try {
                    await current(socket, context, next)
                } catch (err) {
                    console.log('socket middleware handler: error handler', err)
                    await next(err)
                }
            } else {
                if (i >= errorChain.length) return
                const currentErr = errorChain[i++]
                try {
                    await currentErr(originalError, socket, context, next)
                } catch (err) {
                    let chainException = new SessionError({
                        name: 'MiddlewareUnexpectedBrokenchain',
                        message: 'A Chain braker middleware execution in an error chain were detected.',
                        original: originalError,
                        where: i,
                        type: err.name
                    })
                    chainException.eventName = eventName
                    chainException.context = context
                    chainException.id = socket.id
                    chainException.userId = socket.data.userId
                    chainException.sessionId = socket.data.sessionId
                    console.warn(chainException)
                    console.error(err)
                }
            }
        }
        if (chain.length > 0) await next()
    } catch (error) {
        let chainException = new SessionError({
            name: 'MiddlewareUnexpectedBrokenchain',
            message: 'A middleware stopped the execution of the main chain.',
            original: error,
            where: 'main chain',
            type: 'chain stopper'
        })
        chainException.eventName = eventName
        chainException.context = context
        chainException.id = socket.id
        chainException.userId = socket.data.userId
        chainException.sessionId = socket.data.sessionId
        console.warn(chainException)
    }
}
