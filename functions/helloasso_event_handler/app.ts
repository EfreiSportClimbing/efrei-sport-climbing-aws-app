import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSecret } from 'commons/aws.secret';
import { TicketFile } from 'commons/dynamodb.types';
import { EventType, Event, Payment, PaymentState, FormType, Order } from 'commons/helloasso.types';
import { getAccessToken } from 'commons/helloasso.request';
import { fetchOrderExists, getUnsoldTickets, putOrder } from 'commons/dynamodb.tickets';
import { DiscordMessagePost } from 'commons/discord.types';
import { getFile } from './src/s3.tickets';

const DISCORD_SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/discord_bot_token';
const HELLOASSO_SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/helloasso_client_secret';
const DUMMY_RESPONSE: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({
        message: 'ok !',
    }),
};
const ERROR_RESPONSE: APIGatewayProxyResult = {
    statusCode: 400,
    body: JSON.stringify({
        message: 'Bad Request to HelloAsso Event Handler',
    }),
};
const FORMSLUG = 'antrebloc';
const FORMTYPE = FormType.Shop;
const FIELD_DISCORD_USER_ID = 'identifiant helloasso'; // This should match the custom field name in HelloAsso

const HELLO_ASSO_API_URL = 'https://api.helloasso-sandbox.com/v5';

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
    const { data, eventType } = JSON.parse(event.body || '{}') as Event | { data: null; eventType: null };
    if (data && eventType) {
        // check if event is a payment
        if (eventType == EventType.Payment) {
            // check if payment is valid
            const payment = data as Payment;
            if (payment.state == PaymentState.Authorized) {
                // check if order is from climb up
                const { order } = payment;
                if (order.formSlug == FORMSLUG && order.formType == FORMTYPE) {
                    console.log(`Payment authorized for order ${order.id} from form ${order.formSlug}.`);

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

                    if (!response.ok) {
                        console.log(`Error fetching order ${order.id} from HelloAsso: ${response.statusText}`);
                        return ERROR_RESPONSE;
                    }

                    const orderData = (await response.json()) as Order;

                    if (orderData.id != order.id) {
                        console.log('Order does not exist in helloasso.');
                        return DUMMY_RESPONSE;
                    }

                    console.log(`Order ${orderData.id} fetched successfully from HelloAsso.`);

                    // check that order as not already been processed
                    if (await fetchOrderExists(order.id.toString())) {
                        console.log('order already processed.');
                        return DUMMY_RESPONSE;
                    }

                    // Check that the order is less than 10 items
                    if (orderData.items.length > 10) {
                        console.log('Order has more than 10 items, not processing.');
                        return ERROR_RESPONSE;
                    }

                    // Check if the order has a correct discord user id in custom field
                    const fields = orderData.items
                        .map((item) =>
                            item.customFields
                                .filter((field) => field.name === FIELD_DISCORD_USER_ID)
                                .map((field) => field.answer),
                        )
                        .flat();
                    if (fields.length === 0 || !fields[0]) {
                        console.log('No or invalid discord user id found in order custom fields.');
                        return ERROR_RESPONSE;
                    }

                    // make a object with the discord user id and the number of tickets for each id
                    const discordUserIds = fields.reduce((acc: Record<string, number>, id: string) => {
                        if (acc[id]) {
                            acc[id]++;
                        } else {
                            acc[id] = 1;
                        }
                        return acc;
                    }, {});

                    // check if all id are valid
                    for (const id in discordUserIds) {
                        if (!/^\d{17,19}$/.test(id)) {
                            console.log(`Invalid Discord user ID: ${id}`);
                            return ERROR_RESPONSE;
                        }
                    }

                    for (const [discordUserId, ticketCount] of Object.entries(discordUserIds)) {
                        console.log('Sending tickets to Discord user:', discordUserId, 'Count:', ticketCount);

                        // get ticket
                        const tickets = await getUnsoldTickets(ticketCount).catch((err) => {
                            console.error('Error fetching unsold tickets:', err);
                            return [];
                        });

                        if (!tickets || tickets.length === 0) {
                            console.log('No unsold ticket available.');
                            return ERROR_RESPONSE;
                        }

                        // Get file from s3
                        const ticketFiles = await Promise.all(tickets.map(async (ticket) => await getFile(ticket.url)));

                        // log ticket files
                        for (const ticket of tickets) {
                            // update ticket in db
                            await putOrder(order.id.toString(), ticket.id);
                        }

                        // send ticket to discord
                        //TODO send ticket to discord
                        // ! Must create a private channel with the user if it does not exist
                        const url_discord = `https://discord.com/api/v8/users/@me/channels`;
                        const body = {
                            recipient_id: discordUserId,
                        };
                        const responseCreate = await fetch(url_discord, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                            },
                            body: JSON.stringify(body),
                        });

                        const dataCreate = await responseCreate.json();

                        const message: DiscordMessagePost = {
                            content: `Salut, \nVoici tes places Climb-Up du ${new Date().toLocaleDateString()} :`,
                            attachments: ticketFiles.map((file, index) => ({
                                id: index.toString(),
                                filename: `ticket_${index + 1}.pdf`, // Assuming the file is a PDF
                                description: 'application/pdf',
                            })),
                        };

                        const headers = new Headers();
                        headers.append('Authorization', `Bot ${DISCORD_BOT_TOKEN}`);
                        const formData = new FormData();
                        formData.append('payload_json', JSON.stringify(message));
                        // Append each file to the form data
                        for (const [index, file] of ticketFiles.entries()) {
                            const filename = `ticket_${index + 1}.pdf`; // Assuming the file is a PDF
                            formData.append(`files[${index}]`, file, filename);
                        }

                        const response_discord = await fetch(
                            `https://discord.com/api/v8/channels/${dataCreate.id}/messages`,
                            {
                                method: 'POST',
                                headers: headers,
                                body: formData,
                            },
                        );
                        const data_discord = await response_discord.json();
                        console.log(data_discord);
                    }

                    // return ok
                    return DUMMY_RESPONSE;
                }
            }
        } else {
            console.log(`Event type ${eventType} not handled.`);
            return DUMMY_RESPONSE;
        }
    }

    // dummy response
    return ERROR_RESPONSE;
};
