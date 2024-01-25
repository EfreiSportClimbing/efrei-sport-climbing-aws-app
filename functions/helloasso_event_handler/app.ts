import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { expireSession, listSessionsExpired } from 'commons/dynamodb.sessions';
import { getSecret } from 'commons/aws.secret';
import { TicketFile } from 'commons/dynamodb.types';
import { EventType, Event, Payment, PaymentState } from 'commons/helloasso.types';

const DISCORD_SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/discord_bot_token';
const HELLOASSO_SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/helloasso_client_secret';
const DUMMY_RESPONSE: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({
        message: 'ok !',
    }),
};
const FORMSLUG = 'climb-up';
const FORMTYPE = 'Shop';

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
    const { DISCORD_BOT_TOKEN } = await getSecret(SECRET_PATH);
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
                }
            }
        }
    }

    // dummy response
    return DUMMY_RESPONSE;
};
