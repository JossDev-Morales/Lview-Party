import express from "express";
import { authTokenMdwr } from "../midlewares/apiAuth.mdwr.js";
import { UserServices } from "../services/user.services.js";
import { AuthError } from "../errorsHandler/AuthError.class.js";
import { Storage } from "../virtualdata/virtualStorage.js";
import uploader from "../image.tools/store.js";
import multerErrorHandler from "../midlewares/multerErrorHandler.js";
import { Icons } from "../tools/IconGenerator.js";
import AuthValidations from "../validations/auth.validations.service.js";
import UserValidations from "../validations/user.validations.service.js";
import { errors } from "celebrate";
import fs from "fs";
const UserRouter = express.Router();
function init({ io }) {
    UserRouter.get("/api/icons/rawlist", AuthValidations.authToken, authTokenMdwr, async (req, res, next) => {
        try {
            const userID = req.tokenPayload.ID
            const user = await UserServices.getUserById(userID)
            if (!user) {
                throw new AuthError({
                    name: "userNotFound",
                    message: "The token belongs to an user that not longer exist",
                    type: "InexistentUser",
                    code: 5
                });
            }
            res.status(200).json(Icons.genRawList({ isPremium: user.isPremium }))
        } catch (error) {
            next(error)
        }
    },errors)
    // TODO agregar validaciones a los valores del icono
    UserRouter.post("/api/icons/select", AuthValidations.authToken, UserValidations.iconSelection, authTokenMdwr, async (req, res, next) => {
        try {
            const userID = req.tokenPayload.ID
            const user = await UserServices.getUserById(userID)
            if (!user) {
                throw new AuthError({
                    name: "userNotFound",
                    message: "The token belongs to an user that not longer exist",
                    type: "InexistentUser",
                    code: 5
                });
            }
            const { seed, style } = req.body
            await UserServices.updateIcon(userID, { seed, style })
            res.status(200).send()
        } catch (error) {
            next(error)
        }
    },errors)
    // TODO agregar validaciones al valor name
    UserRouter.put("/api/name", AuthValidations.authToken, UserValidations.changeName, authTokenMdwr, async (req, res, next) => {
        try {
            const { name } = req.body
            if (!name) {
                throw new AuthError({ code: 9, name: "MissingData", message: "The new name is neccesary in order to change it", type: "invalidData" })
            }
            const userID = req.tokenPayload.ID
            const user = await UserServices.getUserById(userID)
            if (!user) {
                throw new AuthError({
                    name: "userNotFound",
                    message: "The token belongs to an user that not longer exist",
                    type: "InexistentUser",
                    code: 5
                });
            }
            await UserServices.updateName(userID, { name })
            res.status(200).send()
        } catch (error) {
            next(error)
        }
    },errors)
    UserRouter.post("/api/image/session/:session/message/:message/content/:content", UserValidations.addContent, uploader.single('image'), (req, res, next) => {
        try {
            const { session, message, content } = req.params
            const file = req.file
            if (!file) {
                io.emit(`imageuploader-${message}`, {
                    status: 0,
                    reason: {
                        cause: 'fileNotProvided',
                        code: 0,
                        name: 'fileMissing'
                    }
                })
            }
            let Session = Storage.findByID(session)
            let Message = Session.chat.getMessage(message)
            if (Session, Message) {
                Message.editValues(content, {
                    name: file.filename,
                    extension: file.filename.split('.')[1],
                    loaded: true,
                    saved: true
                })
                io.emit(`imageuploader-${content}`, {
                    status: 1,
                    name: file.filename
                })
            }
            res.sendStatus(200)
        } catch (error) {
            next(error)
        }
    }, multerErrorHandler,errors)
    UserRouter.get("/api/image/session/:session/message/:message/content/:content", UserValidations.addContent, (req, res, next) => {
        try {
            const { session, message, content } = req.params
            let Session = Storage.findByID(session)
            let Message = Session.chat?.getMessage(message)
            if (Session, Message) {
                let Content = Message.getContent(content)
                if (!Content) {
                    res.status(404).json({ Message: 'Content not found' })
                }
                if (Content.type !== 'image') {
                    res.status(404).json({ Message: 'Content is not of image type' })
                }
                res.status(200).json({ name: Content.body.name })
            } else {
                res.status(404).json({ message: 'Session or message not found' })
            }
        } catch (error) {
            next(error)
        }
    },errors)
    UserRouter.post('/api/collection/session/:session/message/:message/content/:content', UserValidations.addContent, uploader.array('image'), (req, res, next) => {
        try {
            const { session, message, content } = req.params
            const files = req.files;
            if (files.length == 0) {
                io.emit(`imageuploader-${message}`, {
                    status: 0,
                    reason: {
                        cause: 'filesNotProvided',
                        code: 0,
                        name: 'filesMissing'
                    }
                })
            }
            let collection = files.map(f => ({
                name: f.filename,
                extension: f.filename.split('.')[1],
                loaded: true,
                saved: true
            }))
            let Session = Storage.findByID(session)
            let Message = Session.chat.getMessage(message)
            if (Session, Message) {
                console.log(collection, files)
                Message.editValues(content, {
                    items: collection.map(f => new ImageItem(f)),
                    loaded: true
                })
                console.log(Message.getContent(content))
                io.emit(`imageuploader-${content}`, {
                    status: 1,
                    items: collection
                })
            }
            res.sendStatus(200)
        } catch (error) {
            next(error)
        }
    }, multerErrorHandler,errors)
    UserRouter.get("/api/collection/session/:session/message/:message/content/:content", UserValidations.addContent, (req, res, next) => {
        try {
            const { session, message, content } = req.params
            let Session = Storage.findByID(session)
            let Message = Session.chat?.getMessage(message)
            if (Session, Message) {
                let Content = Message.getContent(content)
                if (!Content) {
                    res.status(404).json({ Message: 'Content not found' })
                }
                if (Content.type !== 'image') {
                    res.status(404).json({ Message: 'Content is not of image type' })
                }
                if (Content.body.items) {
                    if (Content.body.items.length == 0) {
                        res.status(404).json({ Message: 'Collection is empty' })
                    }
                    res.status(200).json({ items: Content.body.items.map(i => i.build()) })
                }
                else {
                    res.status(200).json({ name: Content.body.name })
                }
            } else {
                res.status(404).json({ message: 'Session or message not found' })
            }
        } catch (error) {
            next(error)
        }
    },errors)
    UserRouter.get("/api/image/:name", UserValidations.getImage, (req, res, next) => {
        const { name } = req.params
        if (!name || !name.split('.')[1]) {
            throw new SessionError({ name: 'dataNotProvided', message: 'the required data was not provided for this endpoint', type: 'data', where: 'GettingImage' })
        }
        let id = name.split('.')[0]
        let ext = name.split('.')[1]
        let validExtensions = ['jpg', 'png', 'webp', 'jpeg']
        if (!validExtensions.includes(ext)) {
            throw new SessionError({ name: 'invalidExtension', message: 'this extension is not a valid extension', type: 'data' })
        }
        const imagepath = path.join(ROOT_DIR, 'uploads', id + "." + ext)
        res.sendFile(imagepath, (err) => {
            if (err) {
                console.log('notFound', err)
                next(err)
            }
        })
    },errors)
    let twemojiMemoryPoint;
    UserRouter.get("/api/emojis/twemoji", (req, res, next) => {
        try {
            const jsonData = twemojiMemoryPoint ?? JSON.parse(fs.readFileSync('data/emojis_twemoji.json', 'utf-8'));
            if (!twemojiMemoryPoint) {
                twemojiMemoryPoint = jsonData
            }
            res.json(jsonData)
        } catch (error) {
            next(error)
        }
    })
    return UserRouter
}
export default init