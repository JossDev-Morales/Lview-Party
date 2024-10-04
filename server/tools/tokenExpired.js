import { decode } from "jsonwebtoken";

/**
 * Verifica si un token JWT ha expirado.
 * @param {string} token - El token JWT a evaluar.
 * @returns {boolean} - Devuelve true si el token ha expirado, false en caso contrario.
 */
export function hasTokenExpired(token) {
    // Decodificar el token sin validar la firma
    const decodedToken = decode(token);

    // Verificar si el token se pudo decodificar y si tiene un campo 'exp'
    if (!decodedToken || !decodedToken.exp) {
        throw new Error('El token no es válido o no tiene un campo de expiración.');
    }

    // Obtener el tiempo actual en segundos
    const currentTime = Math.floor(Date.now() / 1000);

    // Comparar el tiempo de expiración con el tiempo actual
    return decodedToken.exp < currentTime; // Devuelve true si ha expirado
}
