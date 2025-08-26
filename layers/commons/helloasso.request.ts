import axios from "axios";
import url from "url";
import { Order, PaymentState } from "./helloasso.types";

const HELLO_ASSO_API_URL = "https://api.helloasso.com";

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
        .post(`${HELLO_ASSO_API_URL}/oauth2/token`, body, {
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
        .get(`${HELLO_ASSO_API_URL}/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        .then((response: any) => response.data)
        .catch((error: Error) => {
            throw error;
        });
}

export async function cancelPaiementOfOrder(orderId: string, clientId: string, clientSecret: string): Promise<void> {
    const token = await getAccessToken(clientId, clientSecret);
    // get the associated payment and refund it
    const orderDetails = await getOrderDetails(orderId, clientId, clientSecret).catch((error: Error) => {
        throw new Error(`Failed to get order details for order ${orderId}: ${error.message}`);
    });
    if (!orderDetails.payments || !orderDetails.payments[0].id) {
        throw new Error(`No payment found for order ${orderId}`);
    }
    const payments = orderDetails.payments.filter((p) => p.state === PaymentState.Authorized || p.state === PaymentState.Registered);
    if (payments.length === 0) {
        throw new Error(`No authorized or registered payment found for order ${orderId}`);
    }
    // Refund every payment associated with the order
    for (const payment of payments) {
        await axios
            .post(
                `${HELLO_ASSO_API_URL}/payments/${payment.id}/refund`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )
            .catch((error: Error) => {
                throw new Error(`Failed to refund payment ${payment.id} for order ${orderId}: ${error.message}`);
            });
    }
}
