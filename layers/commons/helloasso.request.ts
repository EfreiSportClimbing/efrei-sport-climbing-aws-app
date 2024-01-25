import axios from "axios";
import url from "url";

let accessToken: string | null = null;

async function getAccessToken(clientId: string, clientSecret: string) {
    if (accessToken) {
        return accessToken;
    }
    const body = new url.URLSearchParams();
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
    body.append("grant_type", "client_credentials");
    return await axios
        .post(`https://api.helloasso.com/oauth2/token`, body, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
        .then((response: any) => response.data.access_token)
        .catch((error: Error) => {
            throw error;
        });
}
