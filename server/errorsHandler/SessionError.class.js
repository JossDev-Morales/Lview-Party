import ErrorLogger from "./ErrorLogger.class.js";

export class SessionError extends ErrorLogger{
    constructor({name,message,original,where,type}){
        super(name,message,original)
        this.where=where
        this.type=type
        this.errorType="SessionError"
    }
}