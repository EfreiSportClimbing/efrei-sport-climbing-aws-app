import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSecret } from 'commons/aws.secret';
import { TicketFile } from 'commons/dynamodb.types';
import { EventType, Event, Payment, PaymentState, FormType, Order } from 'commons/helloasso.types';
import { getAccessToken } from 'commons/helloasso.request';
import { getOrder, getUnsoldTicket, putOrder } from 'commons/dynamodb.tickets';

const DISCORD_SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/discord_bot_token';
const HELLOASSO_SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/helloasso_client_secret';
const DUMMY_RESPONSE: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({
        message: 'ok !',
    }),
};
const FORMSLUG = 'climb-up';
const FORMTYPE = FormType.Shop;

const HELLO_ASSO_API_URL = 'https://api.helloasso.com/v5';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { DISCORD_BOT_TOKEN } = await getSecret(DISCORD_SECRET_PATH);
    const { HELLO_ASSO_CLIENT_ID, HELLO_ASSO_CLIENT_SECRET } = await getSecret(HELLOASSO_SECRET_PATH);

    // get event data of helloasso from event.body
    const { data: helloassoevent } = JSON.parse(event.body || '{}') as { data?: Event };
    if (helloassoevent) {
        const { eventType, data } = helloassoevent;
        // check if event is a payment
        if (eventType == EventType.Payment) {
            // check if payment is valid
            const payment = data as Payment;
            if (payment.state == PaymentState.Authorized) {
                // check if order is from climb up
                const { order } = payment;
                if (order.formSlug == FORMSLUG && order.formType == FORMTYPE) {
                    // make request to helloasso to check if order is valid
                    const url = `${HELLO_ASSO_API_URL}/orders/${order.id}`;

                    const token = await getAccessToken(HELLO_ASSO_CLIENT_ID, HELLO_ASSO_CLIENT_SECRET);
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    const orderData = (await response.json()) as Order;

                    if (orderData.id != order.id) {
                        console.log('Order does not exist in helloasso.');
                        return DUMMY_RESPONSE;
                    }
                    // check that order as not already been processed
                    if ((await getOrder(order.id.toString())) != null) {
                        console.log('order already processed.');
                        return DUMMY_RESPONSE;
                    }

                    // get ticket
                    const ticket = await getUnsoldTicket();

                    // update ticket in db
                    await putOrder(order.id.toString(), ticket.id);

                    // send ticket to discord
                    //TODO send ticket to discord

                    // return ok
                    return DUMMY_RESPONSE;
                }
            }
        }
    }

    // dummy response
    return DUMMY_RESPONSE;
};
