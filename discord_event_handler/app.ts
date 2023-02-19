import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sign } from 'tweetnacl';
import { DiscordInteraction, DiscordInteractionData, DiscordInteractionResponse } from './type';

const PUBLIC_KEY: string = process.env.PUBLIC_KEY as string;
const PING_PONG: APIGatewayProxyResult = { statusCode: 200, body: '{"type":1}' };
const UNAUTHORIZED: APIGatewayProxyResult = { statusCode: 401, body: '[UNAUTHORIZED] invalid request signature' };
const DUMMY_RESPONSE: APIGatewayProxyResult = { statusCode: 200, body: '{"type":3,"data":{"content":"BEEP BOOP"}}' };
const RESPONSE_TYPE = {
    PONG: 1,
    ACK_NO_SOURCE: 2,
    MESSAGE_NO_SOURCE: 3,
    MESSAGE_WITH_SOURCE: 4,
    ACK_WITH_SOURCE: 5,
    UPDATE_MESSAGE: 7,
};

function verify_signature(event: APIGatewayProxyEvent): void {
    const signature: string = event.headers['x-signature-ed25519'] as string;
    const timestamp: string = event.headers['x-signature-timestamp'] as string;
    const strBody: string = event.body as string;

    if (
        !sign.detached.verify(
            Buffer.from(timestamp + strBody),
            Buffer.from(signature, 'hex'),
            Buffer.from(PUBLIC_KEY, 'hex'),
        )
    ) {
        throw new Error('Invalid signature');
    }
}

function ping_pong(body: any): boolean {
    if (body?.type === 1) {
        return true;
    }
    return false;
}

function command_handler(body: DiscordInteraction): APIGatewayProxyResult | void {
    const { data, member } = body;
    const { name } = data as DiscordInteractionData;

    if (name === 'foo') {
        const response: DiscordInteractionResponse = {
            type: RESPONSE_TYPE.MESSAGE_WITH_SOURCE,
            data: {
                embeds: [
                    {
                        title: 'bar',
                        description: 'response from foo command',
                        author: {
                            name: member?.user.username,
                            icon_url: 'https://cdn.discordapp.com/embed/avatars/' + member?.user.avatar + '.png',
                            url: 'https://discord.com/users/' + member?.user.id,
                        },
                    },
                ],
            },
            options: {
                ephemeral: true,
            },
        };

        return {
            statusCode: 200,
            body: JSON.stringify(response),
        };
    }
}

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
    // debug log
    console.log('event', event);

    try {
        verify_signature(event);
    } catch (err) {
        console.log('UNAUTHORIZED');
        return UNAUTHORIZED;
    }
    const body = JSON.parse(event.body || '{}') as DiscordInteraction;
    if (ping_pong(body)) {
        console.log('PING PONG');
        return PING_PONG;
    }

    // dummy response
    return command_handler(body) || DUMMY_RESPONSE;
};
