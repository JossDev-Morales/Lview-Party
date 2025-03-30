
import Message from "./Message.class.js";
import Notification from "./notification.class.js";

class Chat {
    constructor({ participants, premiumChat }) {
        this.participants = participants;
        this.premiumChat = premiumChat;
        /**@type {Array<Message|Notification>} */
        this.history = [];
        this.maxHistorySize = premiumChat ? 100 : 20;
    }

    addParticipant() {
        this.participants += 1;
    }
    /**
     * 
     * @returns {Message|undefined}
     */
    last() {
        let messages = this.history
        if (messages.length == 0) {
            return undefined
        }
        return messages[messages.length - 1]
    }
    getMessage(id) {
        console.log(this.history)
        return this.history.find((message) => message.id === id)
    }
    build() {
        return this.history.map(hi => {
            return hi.build()
        })
    }
    updateHistory(message) {
        if (this.history.length >= this.maxHistorySize) {
            this.history.shift();
        }
        this.history.push(message);
    }
    removeMessage(id) {
        let message = this.getMessage(id)
        if (message) {
            this.history = this.history.filter((m) => m.id !== id)
        }
    }
    updatePremium() {
        this.premiumChat = true
        this.maxHistorySize = 100
    }
    deleteChat() {
        this.history.forEach(msg => {
            msg.remove()
        })
        this.participants = undefined
        this.premiumChat = undefined
        this.history = undefined
        this.maxHistorySize = undefined
    }
}
export default Chat




