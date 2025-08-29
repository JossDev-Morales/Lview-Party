class Notification{
    /**
     * 
     * @param {{context:{time:number,userId:string|undefined},message:string}} Notification 
     */
    constructor({context,message}){
        /**
         * @type {{time:number,userId:string|undefined,type:string}}
         * @description Contexto de la notificacion
         */
        this.context={type:'notification',time:context.time,userId:context.userId}
        /**@type {string} */
        this.message=message
    }
    build(){
        return {context:this.context,message:this.message}
    }
    remove(){
        this.context=undefined
        this.message=undefined
    }
}
export default Notification