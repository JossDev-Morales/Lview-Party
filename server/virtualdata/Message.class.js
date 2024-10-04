class Message {
    /**
     * 
     * @param {{content:{type:'text'|'image'|'sticker',body:string,addons:[{type:'image'|'sticker',body:string}]},context:{userID:string}}} message 
     */
    constructor(message,io) {
        const { content:{type,body,addons},context} = message;
        this.content={type,body,addons}
        this.isEditable=type=="text"
        this.edited=false
        this.io=io
        /**
         * @type {{userID:string,type:string}}
         * @description Contexto de el mensaje
         */
        this.context=context
        this.context.type='message'
    }
    edite(newBody){
        if (this.isEditable) {
            this.content.body=newBody
            this.edited=true
        }
    }
}
export default Message