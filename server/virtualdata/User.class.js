import { Socket } from "socket.io"
import { Icons } from "../tools/IconGenerator.js"
import Activity from "./structures/activity.js"


class User{
    /**
     * 
     * @param {{sessionId:string,id:string,socket:Socket,name:string,icon:{style:string,seed:string},type:'registered'|'guest',isPremium:boolean|undefined,owner:boolean|undefined,connectionId:string,activity:{defuse:Function,alertDefuse:Function,on:boolean}}} param0 
     */
    constructor({sessionId,id,socket,name,icon,type,isPremium,owner,connectionId,activity:{on,defuse,alertDefuse}}){
        this.sessionId=sessionId
        this.id=id
        this.socket=socket
        this.name=name
        this.icon=icon
        this.type=type
        this.isPremium=isPremium??false
        this.owner=owner??false
        this.connectionId=connectionId
        this.activity= new Activity({limit:10*60*1000,defuseFunction:(current)=>{
            console.log('inactivity:', this.name, this.id)
            defuse({me:this,current:this})}})
        if(on)this.activity.start()
        this.alertActivity=new Activity({limit:1000*30,defuseFunction:alertDefuse})
        this.activity.addDependencie(()=>this.alertActivity.stop())
    }
    builtData(){
        return {id:this.id,name:this.name,icon:Icons.genIcons(this.icon.style,this.icon.seed,{radius:10}),type:this.type,isPremium:this.isPremium,owner:this.owner}
    }
    join(){
        this.socket.join(this.sessionId)
    }
    /**
     * 
     * @param {string} ev 
     * @param {any} data 
     */
    emit(ev,data){
        this.socket.to(this.sessionId).emit(ev,data)
    }
    emitToMyself(ev,data){
        this.socket.emit(ev,data)
    }
    remove(){
        this.sessionId=undefined
        this.id=undefined
        this.socket=undefined
        this.name=undefined
        this.icon=undefined
        this.type=undefined
    }
    closeConnection(){
        console.log('user:',this.id,'connection was closed')
        this.socket.leave(this.sessionId)
        this.socket.disconnect(true)
        this.remove()
    }
}
export default User