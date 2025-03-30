import { Socket, Server } from 'socket.io'
import Chat from './Chat.class.js'
import Message from './Message.class.js'
import User from './User.class.js'
import Source from "./Source.class.js";
import Notification from './notification.class.js';
import { Icons } from '../tools/IconGenerator.js';
import { UserServices } from '../services/user.services.js';
import { Storage } from './virtualStorage.js';
class Session {
    /**
     * 
     * @param {{ID:string,io:Server,source:{platform:string,url:string,time:number},owner:{ID:string,isPremium:boolean,name:string,icon:{style:string,seed:string},socket:Socket,type:'registered'|'guest'}}} data 
     */
    constructor(data) {
        const {
            ID,
            io,
            source,
            owner: {
                ID: ownerID,
                isPremium,
                name,
                icon,
                socket,
                type
            }
        } = data;
        this.lastActivityTime = new Date();
        this.ID = ID;
        this.io = io
        this.source = new Source(source);
        this.owner = {
            ID: ownerID,
            isPremium,
        };
        /**@type {Set<User>} */
        this.users = new Set()
        this.chat = new Chat({ participants: 0, premiumChat: isPremium })
        /**@type {Set<Source>} */
        this.history = new Set()
        this.usersLimit = this.owner.isPremium ? 15 : 5;
        this.addUser({ sessionID: this.ID, ID: this.owner.ID, name, icon, socket, type, isPremium:this.owner.isPremium, owner:true });
    }
    /**
     * 
     * @param {{content:{type:'text'|'image'|'sticker',body:string,addons:[{type:'image'|'sticker',body:string}]},userID:string}} message 
     */
    async sendMessage({content,userID}) {
        let lastMessage=this.chat.last()
        let user=this.findUser(userID)
        if (lastMessage.context.type!=='notification'&&lastMessage.context.userID==userID&&!lastMessage.last().timeExpires()) {
            let addedContents= await lastMessage.add(content)
            let build=lastMessage.build()
            build.contents=addedContents
            user.emitToMyself('message', build)
            user.emit('message', build)
        } else {
            this.chat.updateHistory(new Message(userID,this));
            let last=this.chat.last()
            await last.init(content)
            let addedContents=last.build()
            user.emitToMyself("message", addedContents)
            user.emit("message", addedContents)
        }
    }
    /**
     * 
     * @param {{context:{userID:string|undefined},message:string}} data 
     */
    sendNotification({ context:{userID}, message }) {
        let notification=new Notification({ context:{time:this.source.formatTime(),userID}, message })
        this.chat.updateHistory(notification)
        this.io.to(this.ID).emit("notification", notification.build())
    }
    updateToPremium() {
        this.owner.isPremium = true
        this.usersLimit = 15
        this.chat.updatePremium()
    }
    /**
     * 
     * @param {{socket:Socket,sessionID:string,ID:string,name:string,icon:{style:string,seed:string},type:'registered'|'guest',isPremium:boolean|undefined,owner:boolean|undefined}} user 
     */
    addUser(user) {
        console.log('adding: ',user)
        if (this.usersLimit > this.users.size) {
            const { socket, sessionID, ID, name, icon, type, isPremium, owner } = user
            let findedUser=this.findUser(ID)
            console.log(findedUser)
            if (!findedUser) {
                const newUser = new User({ ID, sessionID, icon, name, socket, type, isPremium, owner })
                this.users.add(newUser)
                if (type === "registered") {
                    UserServices.updateSessionStatus(ID, { status: true })
                }
                this.chat.addParticipant()
                newUser.join()
                newUser.emit("userJoined", newUser.builtData())
                let welcomeText = [
                    `${name} se ah unido a la sala! 🎉`,
                    `Bienvenido a la sala ${name}! 🎉`,
                    `Hey! es ${name}! 🎉`,
                    `${name} a arribado a la sala! 🎉`,
                    `Damas y caballeros, con ustedes... ${name}! 🎉`,
                    `Ah llegado ${name} a la sala! 🎉`
                ]
                let notification=new Notification({ 
                    context:{time:this.source.formatTime(),userID:ID}, 
                    message: welcomeText[Math.floor(Math.random() * 6)] 
                })
                this.chat.updateHistory(notification)
                newUser.emit("notification", notification.build())
                let streamableData={
                    chat: { history: this.chat.build(), participants: this.chat.participants },
                    sessionData: {
                        ID: this.ID,
                        source: this.source.builtData(),
                        history: this.history
                    },
                    users: Array.from(this.users).map(user => user.builtData()),
                    ownData: newUser.builtData()
                }
                newUser.emitToMyself("joined", streamableData)
            }
        }
    }
    /**
     * 
     * @param {string} userID 
     * @returns {User}
     */
    findUser(userID) {
        return Array.from(this.users).find(user => user.ID == userID)
    }
    /**@param {{platform:string,url:string,time:number}} source */
    changeSource(source) {
        this.history.add(this.source.builtData())
        this.source = new Source(source)
        this.io.to(this.ID).emit('sourceChanged', this.source.builtData())
    }
    /**
     * 
     * @param {{t:number,userID:string}} data 
     */
    changeSourceTime({ t, userID }) {
        this.source.upSourceTime(t)
        const user = this.findUser(userID)
        user.emit('timeChanged', t)
        this.sendNotification({ context: { time: this.source.formatTime(), userID }, message: `${user.name} ${t > this.source.time ? 'adelanto' : 'atraso'} el tiempo de reproduccion al` })
    }
    /**
     * 
     * @param {{pausedAt:number,userID:string}} data 
     */
    pause({ userID, pausedAt }) {
        this.source.upSourceStatus(0)
        const user = this.findUser(userID)
        user.emit('sourcePaused', pausedAt)
        this.sendNotification({ context: { userID, time: this.source.formatTime(pausedAt) }, message: `${user.name} ah pausado al` })
    }
    /**
     * 
     * @param {{playedAt:number,userID:string}} data 
     */
    play({ userID, playedAt }) {
        this.source.upSourceStatus(1)
        const user = this.findUser(userID)
        user.emit('sourcePlayed', playedAt)
        this.sendNotification({ context: { userID, time: this.source.formatTime(playedAt) }, message: `${user.name} ah vuelto a reproducir al` })
    }
    /**
     * 
     * @param {{userID:string,kick:{userID:string,reason}}} data 
     */
    kickUser({ userID, kick }) {
        this.removeUser(kick.userID)
        const user = this.findUser(userID)
        const kickedUser = this.findUser(kick.userID)
        user.emit('userKicked', kick.userID)
        this.sendNotification({ context: { userID }, message: `${user.name} ah sacado a ${kickedUser.name}: ${kick.reason}` })
    }
    removeUser(userID) {
        const user = this.findUser(userID);
        if (user) {
            if (user.type === "registered") {
                UserServices.updateSessionStatus(userID, { status: false })
            }
            user.closeConnection();
            this.users.delete(user);
            if (this.users.size < 1) {
                this.closeSession()
                console.log('session was closed');
            }
        }
    }
    closeAllConnections() {
        for (const user of this.users) {
            this.removeUser(user.ID)
        }
    }
    closeSession(forcemode) {
        if (forcemode) {
            this.closeAllConnections()
        }
        Storage.delete(this)
        this.chat.deleteChat()
        this.history.forEach(src => src.delete())
        this.ID = undefined
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
