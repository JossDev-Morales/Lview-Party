import jwt from 'jsonwebtoken'

class connectionSigner{
    constructor(){
    }
    /**
     * 
     * @param {string} sessionId 
     * @param {string} userId 
     * @returns 
     */
    sign(sessionId,userId,connectionId){
        try {
            const token = jwt.sign({ sessionId, owner:userId, connectionId }, process.env.SECRET_KEY, { expiresIn: "24h" });
            return token
        } catch (error) {
            throw error
        }
    }
    /**
     * 
     * @param {string} token
     * @returns {{owner:string,sessionId:string,connectionId:string}}
     */
    verifyConnection(token){
        try {
            const {owner,sessionId,connectionId} = jwt.verify(token,process.env.SECRET_KEY)
            return {owner,sessionId,connectionId}
        } catch (error) {
            throw error
        }
    }
}
export default new connectionSigner()