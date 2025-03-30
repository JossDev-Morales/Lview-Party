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
        this.time = time
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
        const seconds = t ?? this.time;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60); // Redondear los segundos
    
        // Formatear los segundos siempre con dos dígitos
        const formattedSeconds = secs.toString().padStart(2, '0');
        // Formatear los minutos sin ceros a la izquierda, excepto si hay horas
        const formattedMinutes = hours > 0 ? minutes.toString().padStart(2, '0') : minutes.toString();
    
        // Condicional para decidir el formato
        if (hours > 0) {
            // Formato H:MM:SS si hay horas
            return `${hours}:${formattedMinutes}:${formattedSeconds}`;
        } else {
            // Formato M:SS si no hay horas
            return `${formattedMinutes}:${formattedSeconds}`;
        }
    }
    
    
    
    builtData() {
        return { id:this.ID,platform: this.platform, url: this.url.href, data: this.data, time:this.time, formatedTime:this.formatTime() }
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
