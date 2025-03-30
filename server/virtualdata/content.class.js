import { v4 } from "uuid";
import Message from "./Message.class.js";
import text from "./messagestype/text.body.js";
import url from "./messagestype/url.body.js";
import collection from "./messagestype/collection.body.js";
import ImageItem from "./messagestype/image.body.js";
import Reactions from "./Reactions.class.js";

class content {
    /**
     * 
     * @param {{type:'text'|'url'|'image'|'sticker',body:text|url|collection|ImageItem,referedBy:string|undefined}} content 
     * @param {Message} origin 
     */
    constructor({ type, body, referedBy, refs }) {
        this.id = v4()
        this.isEditable = type === "text"
        this.edited = false
        this.type = type
        this.date = new Date()
        this.body = body
        /** @type {{to:string,by:Array<string>}} */
        this.refs = { to: refs?.to, by:[] }
        this.cration={by:referedBy,childs:[]}
        this.reactions=new Reactions()
    }
    editContent(newbody) {
        Object.keys(newbody).forEach(k => {
            this.body[k] = newbody[k]
        })
    }
    edit(newBody){
        if(this.isEditable){
            this.edited=true
            this.body=newBody
        }
    }
    remove() {
        if(this.type==='image'){
            this.body.delete()
        }
        this.isEditable = undefined
        this.edited = undefined
        this.body = undefined
        this.type = undefined
        this.date = undefined
        this.refs = undefined
        this.cration=undefined

    }
    timeExpires() {
        const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
        return (new Date().getTime() - this.date.getTime()) >= FIVE_MINUTES_IN_MS
    }
    build() {
        return { 
            id: this.id,
            body: this.body.build(),
            type: this.type, 
            date: this.date, 
            isEditable: this.isEditable, 
            edited: this.edited, 
            refs:this.refs,
            creation:this.cration,
            reactions:this.reactions.built()
        }
    }
}
export default content