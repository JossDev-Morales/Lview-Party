import { sendVerifyMail } from '../services/mailer.services.js';

import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { AuthError } from '../errorsHandler/AuthError.class.js';

class OTPStore {
    constructor() {
        this.list = [];
        this.CODE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutos
    }

    generateCode(length = 5) {
        const max = Math.pow(10, length);
        const code = Math.floor(Math.random() * max);
        return code.toString().padStart(length, '0');
    }

    request(mail) {
        try {
            const id = uuidv4();
            const code = this.generateCode();
            const exp = Date.now() + this.CODE_EXPIRATION_MS;

            const req = { id, mail, code, exp };
            this.list.push(req);

            sendVerifyMail(mail, code)
            // Token para identificar esta solicitud de verificación
            const token = jwt.sign({ id, mail }, process.env.SECRET_KEY, { expiresIn: "5m" });

            // Aquí normalmente enviarías el código por correo
            console.log(`[MAIL_VERIFICATION] Código para ${mail}: ${code}`);

            return token;
        } catch (error) {
            throw error
        }
    }

    validate(id, code) {
        try {
            const reqIndex = this.list.findIndex(r => r.id === id);
        if (reqIndex === -1) {
            console.warn(`[VALIDATION] No se encontró la solicitud con id ${id}`);
            throw new AuthError({name:"RequestNotFound",message:"Seems like this OTP was already used",code:8})
        }

        const req = this.list[reqIndex];

        if (Date.now() > req.exp) {
            console.warn(`[VALIDATION] Código expirado para ${req.mail}`);
            this.list.splice(reqIndex, 1); // Limpia entrada expirada
            throw new AuthError({name:"OTPExpired",message:"This OTP expired",code:6})
        }
        if (req.code !== code) {
            console.warn(`[VALIDATION] Código incorrecto para ${req.mail}`);
            throw new AuthError({name:"InvalidOTPCode",message:"Wrong code buddy! try again.",code:9})
        }

        // Validación exitosa
        this.list.splice(reqIndex, 1); // Elimina para evitar reutilización

        const payload = {
            mail: req.mail,
            verifiedAt: Date.now(),
            otp:true
        };

        // Token que representa un correo verificado (validez corta)
        const verifiedToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "10m" });

        return verifiedToken;
        } catch (error) {
            throw error
        }
    }
}
export default new OTPStore()