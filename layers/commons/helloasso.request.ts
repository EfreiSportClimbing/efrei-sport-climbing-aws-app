import axios from "axios";
import url from "url";
import { Order } from "./helloasso.types";

let accessToken: string | null = null;

export async function getAccessToken(clientId: string, clientSecret: string) {
    if (accessToken) {
        return accessToken;
    }
    const body = new url.URLSearchParams();
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
    body.append("grant_type", "client_credentials");
    return await axios
        .post(`https://api.helloasso-sandbox.com/oauth2/token`, body, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
        .then((response: any) => {
            accessToken = response.data.access_token;
            return response.data.access_token;
        })
        .catch((error: Error) => {
            throw error;
        });
}

export async function getOrderDetails(orderId: string, clientId: string, clientSecret: string): Promise<Order> {
    const token = await getAccessToken(clientId, clientSecret);
    return await axios
        .get(`https://api.helloasso-sandbox.com/v5/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        .then((response: any) => response.data)
        .catch((error: Error) => {
            throw error;
        });
}
