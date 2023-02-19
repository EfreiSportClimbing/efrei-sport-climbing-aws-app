import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sign } from 'tweetnacl';
import {
    DiscordActionRow,
    DiscordButton,
    DiscordButtonStyle,
    DiscordComponentType,
    DiscordInteraction,
    DiscordApplicationCommandData,
    DiscordInteractionResponse,
    DiscordInteractionResponseType,
    DiscordInteractionType,
    DiscordMessageComponentData,
    DiscordInteractionFlags,
} from './type';

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

function command_handler(body: DiscordInteraction): APIGatewayProxyResult | void {
    const { data, member } = body;
    const { name } = data as DiscordApplicationCommandData;

    if (name === 'foo') {
        const button1: DiscordButton = {
            type: DiscordComponentType.Button,
            style: 1,
            label: 'Register',
            custom_id: 'register',
        };
        const button2: DiscordButton = {
            type: 2,
            style: DiscordButtonStyle.Danger,
            label: 'Leave',
            custom_id: 'leave',
        };
        const actionRow: DiscordActionRow = {
            type: DiscordComponentType.ActionRow,
            components: [button1, button2],
        };

        const response: DiscordInteractionResponse = {
            type: DiscordInteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [
                    {
                        title: 'bar',
                        description: 'response from foo command',
                        author: {
                            name: member?.user.username,
                            icon_url: member?.user.avatar
                                ? `https://cdn.discordapp.com/avatars/${member?.user.id}/${member?.user.avatar}.png`
                                : `https://cdn.discordapp.com/embed/avatars/${member?.user.discriminator}.png`,
                            url: 'https://discord.com/users/' + member?.user.id,
                        },
                    },
                ],
                flags: DiscordInteractionFlags.Ephemeral,
                components: [actionRow],
            },
        };

        return {
            statusCode: 200,
            body: JSON.stringify(response),
        };
    }
}

function button_handler(body: DiscordInteraction): APIGatewayProxyResult | void {
    const { data } = body;
    const { custom_id } = data as DiscordMessageComponentData;

    if (custom_id === 'register') {
        const response: DiscordInteractionResponse = {
            type: DiscordInteractionResponseType.ChannelMessageWithSource,
            data: {
                content: 'register button clicked',
                flags: DiscordInteractionFlags.Ephemeral,
            },
        };

        return {
            statusCode: 200,
            body: JSON.stringify(response),
        };
    } else if (custom_id === 'leave') {
        const response: DiscordInteractionResponse = {
            type: DiscordInteractionResponseType.ChannelMessageWithSource,
            data: {
                content: 'leave button clicked',
                flags: DiscordInteractionFlags.Ephemeral,
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

    if (body.type === DiscordInteractionType.ApplicationCommand) {
        return command_handler(body) || DUMMY_RESPONSE;
    } else if (body.type === DiscordInteractionType.MessageComponent) {
        return button_handler(body) || DUMMY_RESPONSE;
    }

    // dummy response
    return DUMMY_RESPONSE;
};
