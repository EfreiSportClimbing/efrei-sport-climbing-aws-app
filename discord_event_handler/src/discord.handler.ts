import { APIGatewayProxyResult } from 'aws-lambda';
import {
    DiscordActionRow,
    DiscordButton,
    DiscordButtonStyle,
    DiscordComponentType,
    DiscordInteraction,
    DiscordApplicationCommandData,
    DiscordInteractionResponse,
    DiscordInteractionResponseType,
    DiscordMessageComponentData,
    DiscordInteractionFlags,
} from './type';

export function foo_handlher(body: DiscordInteraction): APIGatewayProxyResult {
    const { member } = body;
    const button1: DiscordButton = {
        type: DiscordComponentType.Button,
        style: 1,
        label: 'Register',
        custom_id: 'register',
    };
    const button2: DiscordButton = {
        type: DiscordComponentType.Button,
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

export function command_handler(body: DiscordInteraction): APIGatewayProxyResult | void {
    const { data } = body;
    const { name } = data as DiscordApplicationCommandData;

    if (name === 'séance') {
        return foo_handlher(body);
    } else if (name === 'activité') {
        return void 0;
    } else if (name === 'helloasso') {
        return void 0;
    } else if (name === 'inscription') {
        return void 0;
    } else if (name === 'relevé') {
        return void 0;
    }
}

export function button_handler(body: DiscordInteraction): APIGatewayProxyResult | void {
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
