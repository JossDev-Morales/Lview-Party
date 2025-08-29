class Activity {
    constructor({limit,autostart,defuseFunction}){
        //natural default limit: (1000ms/1s/1m) 1 minute
        this.limit=limit??1000*60
        this.timeout=null
        this.defuseFunction=defuseFunction
        this.running=false
        this.lastTouch=null
        this.dependencies=[]
        if(autostart){
            this.start()
        }
    }
    start(){
        if(!this.running){
            this.running=true
            this.timeout=setTimeout(()=>{if(this.defuseFunction)this.defuseFunction(this)},this.limit)
        }
    }
    stop(){
        if(this.running){
            this.running=false
            clearTimeout(this.timeout)
            this.timeout=null
        }
    }
    reload(){
        this.stop()
        this.start()
    }
    touch(){
        let touchDate=new Date()
        if(!this.lastTouch || (touchDate-this.lastTouch) > 10000){
            this.reload()
            this.lastTouch=touchDate
            this.dependencies.forEach(d=>d())
        }
    }
    addDependencie(...dependencies){
        this.dependencies.push(...dependencies)
    }
    setLimit(limit) {
        this.limit = limit;
        if (this.running) this.reload();
    } 
}
export default Activity