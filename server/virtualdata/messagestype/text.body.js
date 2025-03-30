class text{
    constructor({value,addons}){
        this.addons=addons
        this.value=value
    }
    build(){
        return {value:this.value,addons:this.addons}
    }
}
export default text