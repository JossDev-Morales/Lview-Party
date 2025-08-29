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
     * @param {string} userId 
     * @returns 
     */
    verifyConnection(token,userId){
        try {
            const {owner} = jwt.verify(token,process.env.SECRET_KEY)
            return owner===userId
        } catch (error) {
            throw error
        }
    }
    /**
     * 
     * @param {string} token 
     * @returns 
     */
    tokenSessionId(token){
        try {
            const {sessionId} = jwt.verify(token,process.env.SECRET_KEY)
            return sessionId
        } catch (error) {
            throw error
        }
    }
}
export default new connectionSigner()