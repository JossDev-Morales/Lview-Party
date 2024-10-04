import Session from './Session.class.js';
/**
 * Clase que extiende Set para almacenar instancias de Session.
 * @extends {Set<Session>}
 */
class SessionStorage extends Set {
    /**
     * Crea una instancia de SessionStorage.
     */
    constructor() {
        super();
    }

    /**
     * Añade una sesión al storage.
     * @param {Session} session - La sesión a añadir.
     * @throws {Error} Si la sesión ya existe en el storage.
     */
    add(session) {
        if (!(session instanceof Session)) {
            throw new Error('El objeto debe ser una instancia de Session.');
        }
        if (this.has(session)) {
            throw new Error('La sesión ya existe en el storage.');
        }
        super.add(session);
    }

    /**
     * Encuentra una sesión por su ID.
     * @param {string} sessionID - El ID de la sesión a buscar.
     * @returns {Session | undefined} La sesión encontrada o undefined si no se encuentra.
     */
    findByID(sessionID) {
        for (const session of this) {
            if (session.ID === sessionID) {
                return session;
            }
        }
        return undefined;
    }

    /**
     * Valida si una sesión cumple con los criterios necesarios.
     * @param {Session} session - La sesión a validar.
     * @returns {boolean} True si la sesión es válida, false en caso contrario.
     */
    validate(session) {
        // Aquí puedes agregar la lógica para validar la sesión.
        return session instanceof Session;
    }

    /**
     * Crea una sesión y la añade al storage.
     * @param {{ID:string,io:Server,source:{platform:string,url:string,time:number},owner:{ID:string,isPremium:boolean,name:string,icon:{style:string,seed:string},socket:Socket,type:'registered'|'guest'}}} sessionData - Los datos necesarios para crear una sesión.
     * @returns {Session} La sesión creada y añadida al storage.
     */
    createSession(sessionData) {
        const session = new Session(sessionData);
        this.add(session);
        return session;
    }
}
export const Storage = new SessionStorage()

