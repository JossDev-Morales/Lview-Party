class url {
    constructor({ url, title, description, canonical, host, siteName, image }) {
        this.url = url
        this.canonical = canonical
        this.title = title
        this.description = description
        this.host = host
        this.image = image
    }
    static getStyle(url) {
        let data = new URL(url)
        const socials = [
            'x.com',
            'twitter.com',
            'instagram.com',
            'facebook.com',
            'discord.com',
            'discord.gg',
            'linkedin.com',
            'youtu.be',
            'tiktok.com',
            'pinterest.com'
        ]
       
        data= data.hostname.split('.')
        data.shift()
        data=data.join('.')
        let some=socials.some(domain => domain===data)
        return  some? 'social' : 'basic'
    }
    build() {
        return { url:this.url,title: this.title, host: this.host, description: this.description, canonical: this.canonical, image: this.image }
    }
}
export default url