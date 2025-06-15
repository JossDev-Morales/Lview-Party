import axios from 'axios'
export async function recoveryRequest(mail) {
    try {
        let headersList = {
            "Content-Type": "application/json"
        }
        let bodyContent = JSON.stringify({ "mail": mail });

        let reqOptions = {
            url: "https://lview-party.onrender.com/api/auth/recovery/request",
            method: "POST",
            headers: headersList,
            data: bodyContent,
        }

        let response = await axios.request(reqOptions);
        return response?.data?.token
    } catch (error) {
        throw error
    }
}
export async function recoveryValidation(token, otp) {
    try {
        let headersList = {
            "Content-Type": "application/json"
        }
        let bodyContent = JSON.stringify({ "token": token, "code": otp });

        let reqOptions = {
            url: "https://lview-party.onrender.com/api/auth/recovery/verification",
            method: "POST",
            headers: headersList,
            data: bodyContent,
        }

        let response = await axios.request(reqOptions);
        return response?.data?.token
    } catch (error) {
        throw error
    }
}
export async function resetPassword(token, password) {
    try {
        let headersList = {
            "Content-Type": "application/json"
        }

        let bodyContent = JSON.stringify({ "password": password, "token": token });

        let reqOptions = {
            url: "https://lview-party.onrender.com/api/auth/recovery/reset",
            method: "POST",
            headers: headersList,
            data: bodyContent,
        }

        let response = await axios.request(reqOptions);
    } catch (error) {
        throw error
    }
}