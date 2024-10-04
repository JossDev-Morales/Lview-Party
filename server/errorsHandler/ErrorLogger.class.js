class ErrorLogger extends Error {
    constructor(name,message,original){
        super(message)
        this.name=name
        this.original=original??'selfreferenced'
    }
    log(){
        console.log(this)
    }
    build(){
        return {message:this.message,...this}
    }
}
export default ErrorLogger