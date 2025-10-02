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
        }).then(async (res) => {
            if (res.status === 204) {
                await expireSession(session.id);
            } else {
                throw new Error(`Failed to delete message (status: ${res.status})`);
            }
        });

    // Process sessions with a true concurrency pool of max 5
    const CONCURRENCY_LIMIT = 5;
    const executing = new Set<Promise<void>>();
    const retries: Record<string, number> = {};

    while (sessions.length) {
        const session = sessions.shift(); // Get the next session

        if (!session) break; // Safety check

        const promise = deleteMessage(session)
            .then(() => {
                executing.delete(promise);
                // Timeout a short duration to avoid rate limiting
                return new Promise((resolve) => setTimeout(resolve, 500)).then(() => {
                    return;
                });
            })
            .catch((error) => {
                // Log the error and remove from executing set
                console.error(`Error deleting message for session ${session.id}:`, error, ' retrying in next run');
                executing.delete(promise);

                // Track retries
                if (!retries[session.id]) retries[session.id] = 0;
                else retries[session.id]++;

                // Retry up to 3 times
                if (retries[session.id] < 3) {
                    sessions.push(session); // Re-add the session to the list for retry
                } else {
                    console.error(`Max retries reached for session ${session.id}. Giving up.`);
                }
            });
        // Add the promise to the executing set
        executing.add(promise);

        // If we reached the concurrency limit, wait for one to complete
        if (executing.size >= CONCURRENCY_LIMIT) {
            await Promise.race(executing);
        }
    }

    // Wait for all remaining promises to complete
    await Promise.all(executing);

    return DUMMY_RESPONSE;
};
