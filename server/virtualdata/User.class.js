import { Socket } from "socket.io"
import { Icons } from "../tools/IconGenerator.js"


class User{
    /**
     * 
     * @param {{sessionID:string,ID:string,socket:Socket,name:string,icon:{style:string,seed:string},type:'registered'|'guest'}} param0 
     */
    constructor({sessionID,ID,socket,name,icon,type}){
        this.sessionID=sessionID
        this.ID=ID
        this.socket=socket
        this.name=name
        this.icon=icon
        this.type=type
    }
    builtData(){
        return {ID:this.ID,name:this.name,icon:Icons.genIcons(this.icon.style,this.icon.seed,{radius:10}),type:this.type}
    }
    join(){
        this.socket.join(this.sessionID)
    }
    /**
     * 
     * @param {string} ev 
     * @param {any} data 
     */
    emit(ev,data){
        this.socket.to(this.sessionID).emit(ev,data)
    }
    emitToMyself(ev,data){
        this.socket.emit(ev,data)
    }
    remove(){
        this.sessionID=undefined
        this.ID=undefined
        this.socket=undefined
        this.name=undefined
        this.icon=undefined
        this.type=undefined
    }
    closeConnection(){
        this.socket.leave(this.sessionID)
        this.socket.disconnect(true)
        this.remove()
    }
}
export default User