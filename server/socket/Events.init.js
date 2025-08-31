import { Socket } from "socket.io"
import useMiddlewares from "./useMiddlewares"

/**
 * 
 * @param {Socket} socket 
 * @param {any} context 
 * @param {Function} next 
 */
export default async function eventsInit(socket,context,next) {
    try {
        socket.on('pause',(data=>{
            useMiddlewares(socket,'pause',data,(socket,context,next)=>{console.log('pause')},(err,socket,context,next)=>{
                console.log(err)
            })
        }))
    } catch (error) {
        next(error)
    }
}