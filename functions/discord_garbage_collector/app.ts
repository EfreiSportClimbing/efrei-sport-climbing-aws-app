import { APIGatewayProxyResult } from 'aws-lambda';
import { expireSession, listSessionsExpired } from 'commons/dynamodb.sessions';
import { getSecret } from 'commons/aws.secret';
import { Session } from 'commons/dynamodb.types';

const SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/discord_bot_token';
const DUMMY_RESPONSE: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({
        message: 'ok !',
    }),
};
const CHANNELS: { [key: string]: string } = {
    antrebloc: process.env.ANTREBLOC_CHANNEL as string,
    'climb-up': process.env.CLIMBUP_CHANNEL as string,
    'climb-up-bordeaux': process.env.CLIMBUP_BORDEAUX_CHANNEL as string,
};

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
    // debug log
    const sessions = await listSessionsExpired();
    const { DISCORD_BOT_TOKEN } = await getSecret(SECRET_PATH);

    const deleteMessage = async (session: Session) =>
        await fetch(`https://discord.com/api/v10/channels/${CHANNELS[session.location]}/messages/${session.id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            },
        }).then(async (res) => (res.status == 204 ? await expireSession(session.id) : console.log('error :', res)));

    // Process sessions with a true concurrency pool of max 5
    const CONCURRENCY_LIMIT = 5;
    const executing = new Set<Promise<void>>();

    for (const session of sessions) {
        const promise = deleteMessage(session).then(() => {
            executing.delete(promise);
        });
        executing.add(promise);

        if (executing.size >= CONCURRENCY_LIMIT) {
            await Promise.race(executing);
        }
    }

    // Wait for all remaining promises to complete
    await Promise.all(executing);

    return DUMMY_RESPONSE;
};
