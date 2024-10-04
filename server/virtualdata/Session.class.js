import { Socket, Server } from 'socket.io'
import Chat from './Chat.class.js'
import Message from './Message.class.js'
import User from './User.class.js'
import Source from "./Source.class.js";
import Notification from './notification.class.js';
import { Icons } from '../tools/IconGenerator.js';
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
            ID,
            isPremium,
        };
        this.socketConnection = this.socketConnection
        /**@type {Set<User>} */
        this.users = new Set()
        this.chat = new Chat({ participants: 0, premiumChat: isPremium })
        /**@type {Set<Source>} */
        this.history = new Set()
        this.usersLimit = this.owner.isPremium ? 15 : 3;
        this.addUser(new User({ sessionID: ID, ID: ownerID, name, icon, socket, type }))
    }
    /**
     * 
     * @param {{content:{type:'text'|'image'|'sticker',body:string,addons:[{type:'image'|'sticker',body:string}]},userID:string}} message 
     */
    sendMessage({ content, userID }) {
        this.chat.updateHistory(new Message({ content, context:{userID} },this.io));
        this.findUser(userID).emit("message", { content, userID })
    }
    /**
     * 
     * @param {{context:{time:number,userID:string|undefined},message:string}} data 
     */
    sendNotification({context,message}){
        this.chat.updateHistory(new Notification({context,message}))
        this.findUser(context.userID).emit("notification", {context, message})
    }
    updateToPremium() {
        this.owner.isPremium = true
        this.usersLimit = 15
        this.chat.updatePremium()
    }
    /**
     * 
     * @param {{socket:Socket,userID:string,name:string,icon:{style:string,seed:string},type:'registered'|'guest'}} user 
     */
    addUser(user) {
        if (this.usersLimit > this.users.size) {
            const { socket, userID, name, icon, type } = user
            if (!this.findUser(userID)) {
                const newUser = new User({ ID:userID, icon, name, socket, type })
                this.users.add(newUser)
                this.chat.addParticipant()
                newUser.join()
                newUser.emitToMyself("joined", {
                    chat: { history: this.chat.history, participants: this.chat.participants },
                    sessionData: {
                        ID: this.ID,
                        source: this.source.builtData(),
                        history: this.history
                    },
                    users: Array.from(this.users).map(user=>user.builtData()),
                    ownData: newUser.builtData()
                })
                newUser.emit("userJoined", newUser.builtData())
                let welcomeText = [
                    `${name} se ah unido a la sala! 🎉`,
                    `Bienvenido a la sala ${name}! 🎉`,
                    `Hey! es ${name}! 🎉`,
                    `${name} a arribado a la sala! 🎉`,
                    `Damas y caballeros, con ustedes... ${name}! 🎉`,
                    `Ah llegado ${name} a la sala! 🎉`
                ]
                this.sendNotification({
                    context:{userID},
                    message:welcomeText[Math.floor(Math.random() * 6)]
                })
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
        this.history.add(this.source)
        this.source = new Source(source)
        this.io.to(this.ID).emit('sourceChanged', this.source.builtData())
    }
    /**
     * 
     * @param {{t:number,userID:string}} data 
     */
    changeSourceTime({t,userID}){
        this.source.upSourceTime(t)
        const user = this.findUser(userID)
        user.emit('timeChanged',t)
        this.sendNotification({context:{time:this.source.formatTime(),userID},message:`${user.name} ${t>this.source.time?'adelanto':'atraso'} el tiempo de reproduccion al`})
    }
    /**
     * 
     * @param {{pausedAt:number,userID:string}} data 
     */
    pause({ userID, pausedAt }) {
        this.source.upSourceStatus(0)
        const user = this.findUser(userID)
        user.emit('sourcePaused', pausedAt)
        this.sendNotification({context:{userID,time:this.source.formatTime(pausedAt)},message:`${user.name} ah pausado al`})
    }
    /**
     * 
     * @param {{playedAt:number,userID:string}} data 
     */
    play({userID,playedAt}){
        this.source.upSourceStatus(1)
        const user = this.findUser(userID)
        user.emit('sourcePlayed', playedAt)
        this.sendNotification({context:{userID,time:this.source.formatTime(playedAt)},message:`${user.name} ah vuelto a reproducir al`})
    }
    /**
     * 
     * @param {{userID:string,kick:{userID:string,reason}}} data 
     */
    kickUser({userID,kick}){
        this.removeUser(kick.userID)
        const user = this.findUser(userID)
        const kickedUser = this.findUser(kick.userID)
        user.emit('userKicked',kick.userID)
        this.sendNotification({context:{userID},message:`${user.name} ah sacado a ${kickedUser.name}: ${kick.reason}`})
    }
    removeUser(userID) {
        const user = this.findUser(userID);
        if (user) {
            user.closeConnection();
            this.users.delete(user);
        }
    }
    closeAllConnections() {
        for (const user of this.users) {
            this.removeUser(user.ID)
        }
    }
    closeSession() {
        this.closeAllConnections()
        this.chat.deleteChat()
        this.history.forEach(src => src.delete())
        this.ID = undefined
        this.chat = undefined
        this.source = undefined
        this.lastActivityTime = undefined
        this.owner = undefined
        this.platform = undefined
        this.socketConnection = undefined
        this.users = undefined
        this.usersLimit = undefined
    }

}
export default Session
