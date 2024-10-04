class Notification{
    /**
     * 
     * @param {{context:{time:number,userID:string|undefined},message:string}} Notification 
     */
    constructor({context,message}){
        /**
         * @type {{time:number,userID:string|undefined,type:string}}
         * @description Contexto de la notificacion
         */
        this.context=context
        this.context.type='notification'
        /**@type {string} */
        this.message=message
    }
}
export default Notification