import jwt from 'jsonwebtoken'

class connectionSigner{
    constructor(){
    }
    /**
     * 
     * @param {string} sessionId 
     * @param {string} userId 
     * @returns {string} token
     */
    sign(sessionId,userId,connectionId){
        console.log('connection id in signer')
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
            const data = jwt.verify(token,process.env.SECRET_KEY)
            const {owner,sessionId,connectionId}=data
            console.log(data)
            return {owner,sessionId,connectionId}
        } catch (error) {
            throw error
        }
    }
}
export default new connectionSigner()