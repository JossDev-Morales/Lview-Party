import { v4 } from "uuid"
import { SessionError } from "../errorsHandler/SessionError.class.js"
const invalidDataError = new SessionError({ name: "InvalidOrInsuficientData", message: 'One or more values were invalid or missed', type: 'invalidData', where: 'reactions' })
class Reaction {
    constructor({ charset, name, source, userId }) {
        this.id = v4()
        this.ownerId=userId
        this.name = { eng: name.eng, es: name.es }
        this.source = source
        this.charset = charset
    }
    isOfChar(charset) {
        if (!charset) throw invalidDataError
        return charset===this.charset
    }
    built(){
        return {id:this.id,ownerId:this.ownerId,name:this.name,source:this.source,charset:this.charset}
    }
}
class Reactions {
    #reactions = []
    constructor() {
        /**
         * @type {[Reaction]} 
         * */
        this.#reactions = []
    }
    /**
     * 
     * @param {string} id 
     * @returns {Reaction}
     */
    find(id) {
        if (!id) throw invalidDataError
        return this.#reactions.find(r => r.id === id)
    }
    countReactions(charset) {
        try {
            if (!charset) throw invalidDataError
            return this.#reactions.filter(reaction => reaction.isOfChar(charset)).length
        } catch (error) {
            throw error
        }
    }
    /**
     * 
     * @param {{charset:string,source:string,name:{eng:string,es:string}}} data 
     * @returns {Reaction}
     */
    add(data) {
        try {
            if (!data) throw invalidDataError
            if (!data.charset || !data.name || !data.source||!data.userId) throw invalidDataError
            if(this.#reactions.some(r=>r.ownerId===data.userId&&r.charset===data.charset))throw new SessionError({name:"DuplicatedReaction",message:"Can't react with the same emoji twice",type:'InvalidReaction',where:'AddingReaction'})
            const reaction = new Reaction(data)
            this.#reactions.push(reaction)
            const count=this.countReactions(reaction.charset)
            return {reaction:reaction.built(),count}
            
        } catch (error) {
            throw error
        }
    }
    remove(id) {
        try {
            if (!id) throw invalidDataError
            let currentReaction=this.find(id)
            if(!currentReaction)throw new SessionError({name:"ReactionNotFound",message:"The reaction was not foundedd in the reactions collection",type:"NotFoundData",where:"RemovingReaction"})
            this.#reactions = this.#reactions.filter(reaction =>reaction.id !== id)
            const count=this.countReactions(currentReaction.charset)
            return count
        } catch (error) {
            throw error
        }
    }
    built() {
        return this.#reactions
    }
}
export default Reactions