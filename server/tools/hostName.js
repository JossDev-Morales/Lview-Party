function getServiceName(hostname) {
    try {
        const parts = hostname.split('.');

        // Busca el nombre del servicio en las partes
        if (parts.length > 1) {
            // Retorna la penúltima parte, que es el nombre del servicio
            return parts[parts.length - 2];
        } else {
            return hostname; // En caso de un hostname simple sin subdominios
        }
    } catch (error) {
        console.error('Invalid URL:', error);
        return null; // Retorna null en caso de URL inválida
    }
}
export default getServiceName
