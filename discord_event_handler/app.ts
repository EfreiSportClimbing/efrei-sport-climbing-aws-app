import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sign } from 'tweetnacl';
import {
    DiscordInteraction,
    DiscordInteractionResponse,
    DiscordInteractionResponseType,
    DiscordInteractionType,
} from './src/discord.types';
import { command_handler, button_handler } from './src/discord.handler';

const PUBLIC_KEY: string = process.env.PUBLIC_KEY as string;
const PING_PONG: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({ type: 1 } as DiscordInteractionResponse),
};
const UNAUTHORIZED: APIGatewayProxyResult = { statusCode: 401, body: '[UNAUTHORIZED] invalid request signature' };
const DUMMY_RESPONSE: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({
        type: DiscordInteractionResponseType.ChannelMessageNoSource,
        data: { content: 'BEEP BOOP!' },
    }),
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

    if (body.type === DiscordInteractionType.ApplicationCommand) {
        return (await command_handler(body)) || DUMMY_RESPONSE;
    } else if (body.type === DiscordInteractionType.MessageComponent) {
        return button_handler(body) || DUMMY_RESPONSE;
    }

    // dummy response
    return DUMMY_RESPONSE;
};
