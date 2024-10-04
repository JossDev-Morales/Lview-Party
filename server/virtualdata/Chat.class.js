class Chat {
    constructor({ participants, premiumChat }) {
        this.participants = participants;
        this.premiumChat = premiumChat;
        this.history = [];
        this.maxHistorySize = premiumChat ? 100 : 20;
    }

    addParticipant() {
        this.participants += 1;
    }
    updateHistory(message) {
        if (this.history.length >= this.maxHistorySize) {
            this.history.shift();
        }
        this.history.push(message);
    }
    updatePremium(){
        this.premiumChat=true
        this.maxHistorySize=100    
    }
    deleteChat(){
        this.participants=undefined
        this.premiumChat=undefined
        this.history=undefined
        this.maxHistorySize=undefined
    }
}
export default Chat
