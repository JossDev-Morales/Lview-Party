import { Socket, Server } from 'socket.io'
import Chat from './Chat.class.js'
import Message from './Message.class.js'
import User from './User.class.js'
import Source from "./Source.class.js";
import Notification from './notification.class.js';
import { Icons } from '../tools/IconGenerator.js';
import { UserServices } from '../services/user.services.js';
import { Storage } from './virtualStorage.js';
import { v4 } from 'uuid';
import connectionSigner from '../tools/connection.signer.js';
import Activity from './structures/activity.js';
class Session {
    /**
     * 
     * @param {{io:Server,source:{platform:string,url:string,time:number},owner:{id:string,isPremium:boolean},socket:Socket,type:'registered'|'guest'}}} data 
     */
    constructor(data) {
        const {
            io,
            source,
            owner: {
                id: ownerId,
                isPremium
            }
        } = data;
        this.lastActivityTime = new Date();
        this.id = v4();
        this.io = io
        this.source = new Source(source);
        this.owner = {
            id: ownerId,
            isPremium:isPremium??false,
        };
        /**@type {Set<User>} */
        this.users = new Set()
        this.chat = new Chat({ participants: 0, premiumChat: isPremium })
        /**@type {Set<Source>} */
        this.history = new Set()
        this.usersLimit = this.owner.isPremium ? 15 : 5;
        this.AFKAlert=new Activity({limit:1000*60*2,defuseFunction:()=>{this.closeSession(true)}})
        this.AFKReminder1=new Activity({limit:1000*110,defuseFunction:()=>{this.io.to(this.id).emit('AFKReminder')}})
        this.AFKReminder2=new Activity({limit:1000*90,defuseFunction:()=>{this.io.to(this.id).emit('AFKReminder')}})
        this.AFKReminder3=new Activity({limit:1000*60,defuseFunction:()=>{this.io.to(this.id).emit('AFKReminder')}})
        this.AFKSensor=new Activity({limit:1000*60*60,autostart:true,defuseFunction:()=>{
            this.io.to(this.id).emit('AFK')
            this.AFKAlert.start()
            this.AFKReminder1.start()
            this.AFKReminder2.start()
            this.AFKReminder3.start()
            
        }})
        this.AFKSensor.addDependencie(
            ()=>{this.AFKAlert.stop()},
            ()=>{this.AFKReminder1.stop()},
            ()=>{this.AFKReminder2.stop()},
            ()=>{this.AFKReminder3.stop()}
        )
    }
    getData(){
        return {
                    chat: { history: this.chat.build(), participants: this.chat.participants },
                    sessionData: {
                        id: this.id,
                        source: this.source.builtData(),
                        history: this.history,
                        owner:this.owner
                    },
                    users: Array.from(this.users).map(user => user.builtData())
                }
    }
    /**
     * 
     * @param {{content:{type:'text'|'image'|'sticker',body:string,addons:[{type:'image'|'sticker',body:string}]},userId:string}} message 
     */
    async sendMessage({content,userId}) {
        let lastMessage=this.chat.last()
        let user=this.findUser(userId)
        if (lastMessage.context.type!=='notification'&&lastMessage.context.userId==userId&&!lastMessage.last().timeExpires()) {
            let addedContents= await lastMessage.add(content)
            let build=lastMessage.build()
            build.contents=addedContents
            user.emitToMyself('message', build)
            user.emit('message', build)
        } else {
            this.chat.updateHistory(new Message(userId,this));
            let last=this.chat.last()
            await last.init(content)
            let addedContents=last.build()
            user.emitToMyself("message", addedContents)
            user.emit("message", addedContents)
        }
    }
    /**
     * 
     * @param {{context:{userId:string|undefined},message:string}} data 
     */
    sendNotification({ context:{userId}, message }) {
        let notification=new Notification({ context:{time:this.source.formatTime(),userId}, message })
        this.chat.updateHistory(notification)
        this.io.to(this.id).emit("notification", notification.build())
    }
    updateToPremium() {
        this.owner.isPremium = true
        this.usersLimit = 15
        this.chat.updatePremium()
    }
    /**
     * 
     * @param {{id:string,name:string,icon:{style:string,seed:string},type:'registered'|'guest',isPremium:boolean|undefined,owner:boolean|undefined}} user 
     * @returns {undefined|string}
     */
    addUser(user) {
        console.log('adding: ',user)
        if (this.usersLimit > this.users.size) {
            const { id, name, icon, type, isPremium, owner } = user
            let findedUser=this.findUser(id)
            if (!findedUser) {
                let connectionId= v4()
                const newUser = new User({ id, sessionId:this.id, icon, name, type, isPremium, owner, connectionId,activity:{
                    defuse:({me,current})=>{
                    if(me.socket){
                        //mecanismo de alerta
                        me.emitToMyself('defuseAlert',current.alertActivity.limit)
                        current.alertActivity.start()
                    } else {
                        this.removeUser(me.id)
                    }
                },
                alertDefuse:({me})=>{this.removeUser(me.id)},
                on:this.source.status===0
                }})
                this.users.add(newUser)
                this.chat.addParticipant()
                return connectionSigner.sign(this.id, id, connectionId)
            }
        }
    }
    /**
     * 
     * @param {string} userId 
     * @returns {User}
     */
    findUser(userId) {
        return Array.from(this.users).find(user => user.id == userId)
    }
    /**@param {{platform:string,url:string,time:number}} source */
    changeSource(source) {
        this.history.add(this.source.builtData())
        this.source = new Source(source)
        this.io.to(this.id).emit('sourceChanged', this.source.builtData())
    }
    /**
     * 
     * @param {{t:number,userId:string}} data 
     */
    changeSourceTime({ t, userId }) {
        this.source.upSourceTime(t)
        const user = this.findUser(userId)
        user.emit('timeChanged', t)
        this.sendNotification({ context: { time: this.source.formatTime(), userId }, message: `${user.name} ${t > this.source.time ? 'adelanto' : 'atraso'} el tiempo de reproduccion al` })
    }
    /**
     * 
     * @param {{pausedAt:number,userId:string}} data 
     */
    pause({ userId, pausedAt }) {
        this.source.upSourceStatus(0)
        this.users.forEach(u=>u.activity.stop())
        const user = this.findUser(userId)
        user.emit('sourcePaused', pausedAt)
        this.sendNotification({ context: { userId, time: this.source.formatTime(pausedAt) }, message: `${user.name} ah pausado al` })
    }
    /**
     * 
     * @param {{playedAt:number,userId:string}} data 
     */
    play({ userId, playedAt }) {
        this.source.upSourceStatus(1)
        this.users.forEach(u=>u.activity.start())
        const user = this.findUser(userId)
        user.emit('sourcePlayed', playedAt)
        this.sendNotification({ context: { userId, time: this.source.formatTime(playedAt) }, message: `${user.name} ah vuelto a reproducir al` })
    }
    /**
     * 
     * @param {{userId:string,kick:{userId:string,reason}}} data 
     */
    kickUser({ userId, kick }) {
        this.removeUser(kick.userId)
        const user = this.findUser(userId)
        const kickedUser = this.findUser(kick.userId)
        user.emit('userKicked', kick.userId)
        this.sendNotification({ context: { userId }, message: `${user.name} ah sacado a ${kickedUser.name}: ${kick.reason}` })
    }
    removeUser(userId) {
        const user = this.findUser(userId);
        if (user) {
            user.closeConnection();
            this.users.delete(user);
            if(this.users.size===0){
                this.AFKSensor.reload()
            }
        }
    }
    closeAllConnections() {
        for (const user of this.users) {
            this.removeUser(user.id)
        }
    }
    closeSession(forcemode) {
        if (forcemode) {
            this.closeAllConnections()
        }
        Storage.delete(this)
        this.chat.deleteChat()
        this.history.forEach(src => src.delete())
        this.id = undefined
        this.chat = undefined
        this.source = undefined
        this.lastActivityTime = undefined
        this.owner = undefined
        this.platform = undefined
        this.users = undefined
        this.usersLimit = undefined
    }

}
export default Session
