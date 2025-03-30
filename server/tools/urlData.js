import { load } from "cheerio"
import fetch from "node-fetch"
import getServiceName from "./hostName.js";

async function scrapeUrlMetadata(url) {
    try {
        const urldata = new URL(url);
        
        let host = getServiceName(urldata.hostname)
        let metadata
        if (host === 'netflix') {
            if (urldata.pathname.includes('watch')) {
                const response = await fetch(url);
                const html = await response.text();
                const $ = load(html);
                metadata = {
                    host,
                    title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
                    description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
                    image: $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '',
                    canonicalUrl: $('link[rel="canonical"]').attr('href') || url
                };
            } else {
                const response = await fetch("https://www.netflix.com");
                const html = await response.text();
                const $ = load(html);
                metadata = {
                    host,
                    title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
                    description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
                    canonicalUrl: $('link[rel="canonical"]').attr('href') || url
                };
            }

            return metadata;
        }
        if (host === 'youtube') {
            if (urldata.pathname.includes('watch')) {
                const response = await fetch(url);
                const html = await response.text();
                const $ = load(html);
                metadata = {
                    host,
                    title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
                    description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
                    image: $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '',
                    canonicalUrl: $('link[rel="canonical"]').attr('href') || url,
                };
            } else {
                const response = await fetch("https://www.youtube.com");
                const html = await response.text();
                const $ = load(html);
                metadata = {
                    host,
                    title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
                    description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
                    image: $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '',
                    canonicalUrl: $('link[rel="canonical"]').attr('href') || url,
                };
            }
            return metadata;
        }
        return null
    } catch (error) {
        console.error('Error scraping URL:', error);
        return null;
    }
}
export default scrapeUrlMetadata
