import { APIGatewayProxyResult } from 'aws-lambda';
import { expireSession, listSessionsExpired } from 'commons/dynamodb.sessions';
import { getSecret } from 'commons/discord.secret';
import { Session } from 'commons/dynamodb.types';

const SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/discord_bot_token';
const DUMMY_RESPONSE: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({
        message: 'ok !',
    }),
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
        fetch(`https://discord.com/api/v8/channels/489476855657660436/messages/${session.id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            },
        }).then((res) => (res.status == 204 ? expireSession(session.id) : console.log('error :', res)));

    const promises = sessions.map((session) => deleteMessage(session));
    await Promise.all(promises);

    return DUMMY_RESPONSE;
};
