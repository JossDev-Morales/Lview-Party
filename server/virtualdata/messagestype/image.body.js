import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 } from 'uuid';

const ROOT_DIR = path.resolve();

class ImageItem {
    constructor(file) {
        this.id = v4();
        this.extension = file?.extension
        this.name = file?.name
        this.loaded = file?.name ? true : false
        this.saved = file?.saved??false
    }
    delete() {
        if (this.saved) {
            const filePath = path.join(ROOT_DIR, 'uploads', this.name);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error al eliminar la imagen: ${filePath}`, err);
                } else {
                    console.log(`Imagen eliminada: ${filePath}`);
                }
            });
        }
        this.id=undefined
        this.extension=undefined
        this.name=undefined
        this.loaded=undefined
        this.saved=undefined
    }
    build() {
        return {
            id: this.id,
            extension: this.extension,
            name: this.name,
            loaded: this.loaded
        }
    }
}
export default ImageItem