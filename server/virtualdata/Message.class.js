import { v4 } from "uuid";
import content from "./content.class.js";
import url from "./messagestype/url.body.js";
import scrapeUrlMetadata from "../tools/urlData.js";
import text from "./messagestype/text.body.js";
import getServiceName from "../tools/hostName.js";
import collection from "./messagestype/collection.body.js";
import ImageItem from "./messagestype/image.body.js";

class Message {
    /**
     * 
     * @param {string} userId 
     * @param {Session} session
     */
    constructor(userId,session) {
        this.id = v4()
        this.session=session
        /**
         * @type {Array<content>}
         * @description Lista de contents del mensaje
         */
        this.contents = []
        /**
         * @type {{userId:string,type:string,date:Date}}
         * @description Contexto de el mensaje
         */
        this.context = { userId, date: new Date(), type: 'message' }
    }
    /**
     * 
     * @param {{type:'text'|'url'|'image'|'sticker',body:string}} content 
     */
    async init(newcontent) {
        await this.add(newcontent)
    }
    editValues(contentId, body) {
        let currentBody = this.getContent(contentId)
        if (currentBody) {
            currentBody.editContent(body)
        }
    }
    edit(contentId, body) {
        let currentBody = this.getContent(contentId)
        if (currentBody) {
            currentBody.edit(body)
        }
    }
    /**
     * 
     * @param {string} contentId 
     * @returns {content}
     */
    getContent(contentId){
        return this.contents.find(c=>c.id===contentId)
    }
    parseString(text) {
        
    }
    /**
     * 
     * @param {{body:string,type:string}} newcontent 
     * @returns {Promise<Array<content>>} creations
     */
    async add(newcontent) {
        let creations = []
        let { body, type, refs } = newcontent
        if (type === "text") {
            let addons = []
            if (this.hasUrl(body)) {
                let parts = body.split(' ')
                let childs = []
                let parsedBody = await Promise.all(parts.map(async(part) => {
                    if ((this.hasUrl(part)&&URL.canParse(part))) {
                        if (this.isUrlScrapable(part)) {

                            childs.push({ body: part, type: 'url' })
                        } else {
                            if(await this.isImageUrl(part)){
                                childs.push({ body: {size:1,name:part}, type: 'image' })
                            }
                        }
                        let addonId = v4()
                        addons.push({ id: addonId, style: url.getStyle(part), name: getServiceName(new URL(part).hostname), value: part })
                        let addonelement = `/$a${addonId}/$a`
                        return addonelement
                    } else {
                        return part;
                    }
                }))
                let addedContent = new content({ body: new text({ value: parsedBody.join(' '), addons }), type: 'text', refs: refs })
                if(refs){
                    this.session.chat.getMessage(refs.to.message).getContent(refs.to.content).refs.by.push({message:this.id,content:addedContent.id})
                } 
                this.contents.push(addedContent)
                creations.push(addedContent.build())
                childs.forEach(c => {
                    c.referedBy = addedContent.id
                })
                let result = await Promise.all(childs.map(async (child) => {
                    let childCreation = await this.add(child)
                    addedContent.cration.childs.push(childCreation[0].id)
                    return childCreation
                }))
                creations.push(result.reverse())
                creations = creations.flat(2)
            } else {
                let addedContent = new content({ body: new text({ value: body, addons }), type: 'text',refs:refs })
                this.contents.push(addedContent)
                creations.push(addedContent)
            }
            return creations
        }
        if (type === 'url') {
            let scrap = await scrapeUrlMetadata(body)
            let addedContent = new content({
                body: new url({
                    url: body,
                    title: scrap.title,
                    description: scrap.description,
                    canonical: scrap.canonicalUrl,
                    host: scrap.host,
                    image: scrap.image,
                    siteName: scrap.siteName
                }), 
                type: 'url', 
                referedBy: newcontent.referedBy,
                refs:refs
            })
            this.contents.push(addedContent)
            creations.push(addedContent.build())
            return creations
        }
        if(type==='image'){
            let addedContent;
            console.log(body,body.size,"size")
            if(body.size===1){
                addedContent= new content({type:'image',body:new ImageItem(body.name?body:undefined),refs:refs})
            } else if(body.size>1){
                addedContent= new content({type:'image',body:new collection(body),refs:refs})
            }
            this.contents.push(addedContent)
            creations.push(addedContent)
            return creations
        }
    }
    hasUrl(text) {
        const urlRegex = /((https?|ftp):\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(:\d+)?(\/[^\s]*)?(\?[^\s]*)?(#[^\s]*)?/g;
        let result=text.match(urlRegex)
        return result?.length > 0;
    }
    isUrlScrapable(url) {
        let data = new URL(url)
        return (data.hostname == "www.netflix.com" || data.hostname == "www.youtube.com")
    }
    async isImageUrl(url){
        try {
            let response = await fetch(url, { method: 'HEAD' });
            let contentType = response.headers.get('content-type');
            if (contentType && contentType.startsWith('image/')) {
              return true;
            } else {
              return false;
            }
          } catch (error) {
            console.error("Error al comprobar la URL:", error);
            return false;
          }
    }
    removeOne(contentId) {
        let indications={removeParent:false,removeChilds:[]}
        let currentBody = this.contents.find(b => b.id == contentId)
        console.log('current removeon',currentBody)
        if (currentBody) {
            if(currentBody.cration.childs.length>0){
                indications.removeChilds=currentBody.cration.childs
            }
            if(this.contents.length===1||(indications.removeChilds&&this.contents.length===1+indications.removeChilds.length)){
                indications.removeParent=true
                return indications
            } else {
                if(this.last().id===currentBody.id){
                    this.contents.pop()
                }else {
                    this.contents = this.contents.filter(cont => cont !== currentBody)
                }
                return indications
            }
        }
    }
    last() {
        return this.contents[this.contents.length - 1]
    }
    buildContents() {
        let buildlist = []
        this.contents.forEach(cont => {
            buildlist.push(cont.build())
        })
        return buildlist
    }
    build() {
        return { id: this.id, contents: this.buildContents(), context: this.context }
    }
    remove() {
        if(this.contents.length>0){
            this.contents.forEach(cont => {
                cont.remove()
            })
        }
        this.contents=undefined
        this.context=undefined
    }
}

export default Message