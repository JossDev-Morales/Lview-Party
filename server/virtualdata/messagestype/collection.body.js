import { v4 } from "uuid"

class collection{
    /**
     * 
     * @param {Array<string>} collection
     */
    constructor({size}){
        this.ID=v4()
        this.items=[]
        this.size=size
        this.loaded=false
    }
    delete(){
        this.items.forEach(image=>{
            image.delete()
        })
        this.ID=undefined
        this.size=undefined
        this.items=undefined
        this.loaded=undefined
    }
    build(){
        return {
            ID:this.ID,
            size:this.size,
            items:this.items.map(i=>i.build()),
            loaded:this.loaded
        }
    }
}
export default collection