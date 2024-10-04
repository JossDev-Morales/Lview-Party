import ErrorLogger from "./ErrorLogger.class.js";

export class AuthError extends ErrorLogger{
    /**@argument {{name:string,message:string,original:Error,type:string,code:number}} data */
    constructor({name,message,original,type,code}){
        super(name,message,original)
        this.code=code
        this.type=type
        this.errorType="AuthError"
    }
}

