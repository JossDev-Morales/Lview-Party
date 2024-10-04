import { v4 } from "uuid"
class Source {
    constructor({ platform, url, time }) {
        this.ID = v4()
        this.platform = platform
        this.url = new URL(url)
        /**@type {{v:string,list:string|undefined,index:string|undefined}|{watch:string}} */
        this.data = platform == 'youtube' ? Object.fromEntries(this.url.searchParams) :
            platform == 'netflix' ? Object.fromEntries([this.url.pathname.split("/").slice(1, 3)]) : "invalidPlatform"
        /** */
        this.querys = Object.fromEntries(this.url.searchParams)
        this.time = 0
        this.status = 0
    }
    upSourceTime(t) {
        this.time = t
    }
    upSourceStatus(statusNumber) {
        this.status = statusNumber
    }
    /**
     * 
     * @param {number} t 
     * @returns {string}
     */
    formatTime(t) {
        const seconds= t??this.time
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        // Formatear las unidades para que siempre tengan dos dígitos
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = secs.toString().padStart(2, '0');

        // Condicional para decidir el formato
        if (hours > 0) {
            return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        } else {
            return `${formattedMinutes}:${formattedSeconds}`;
        }
    }
    /**@param {string} sessionID */
    generateSessionLink(sessionID) {
        let querys = this.url.search.split('')
        return this.url.origin + this.url.pathname + '?session=' + sessionID + '&' + querys.splice(1, querys.length - 1).join("")
    }
    builtData() {
        return { platform: this.platform, url: this.url.href, data: this.data, time:this.time }
    }
    delete() {
        this.ID = undefined
        this.url = undefined
        this.platform = undefined
        this.data = undefined
        this.querys = undefined
        this.time = undefined
    }
}

export default Source
