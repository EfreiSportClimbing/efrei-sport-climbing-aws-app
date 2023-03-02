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
    DiscordMessagePost,
    DiscordEmbed,
    DiscordMessage,
} from 'commons/discord.types';
import { getUser, putUser } from 'commons/dynamodb.users';
import { findSession, putSession } from 'commons/dynamodb.sessions';
import { getSecret } from 'commons/discord.secret';
import { getImage } from './s3.images';

const SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/discord_bot_token';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const generateDate = (day: string, hour: string) => {
    //generate date from command
    const date = new Date();

    const daytoset = DAYS.indexOf(day);
    const currentDay = date.getDay();
    const distance = (daytoset + 7 - currentDay) % 7;
    date.setDate(date.getDate() + distance);

    hour = hour.split('h')[0];
    date.setHours(parseInt(hour));
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
};

export async function seance_handlher(body: DiscordInteraction): Promise<APIGatewayProxyResult> {
    const { member } = body;
    const { data } = body;
    const { options } = data as DiscordApplicationCommandData;

    const day = options?.find((option) => option.name === 'date')?.value as string;
    const hour = options?.find((option) => option.name === 'heure')?.value as string;
    const location = options?.find((option) => option.name === 'salle')?.value as string;

    const date = generateDate(day, hour);

    const session = await findSession(date, location).catch((err) => {
        console.log(err);
        return undefined;
    });

    if (session) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: DiscordInteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: 'La séance est existe déjà',
                },
            }),
        };
    }

    const user = await getUser(member?.user.id as string).catch(() => undefined);
    const { DISCORD_BOT_TOKEN } = await getSecret(SECRET_PATH);

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

    const embed: DiscordEmbed = {
        title: date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }),
        description: `Séance de grimpe à **${location.charAt(0).toUpperCase() + location.slice(1)}**.`,
        fields: [
            {
                name: `Participants :`,
                value: `- ${user?.firstName} ${user?.lastName}`,
                inline: false,
            },
        ],
        author: {
            name: user?.firstName + ' ' + user?.lastName,
            icon_url: member?.user.avatar
                ? `https://cdn.discordapp.com/avatars/${member?.user.id}/${member?.user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${member?.user.discriminator}.png`,
            url: 'https://discord.com/users/' + member?.user.id,
        },
        color: 15844367,
        thumbnail: {
            url: 'attachment://antrebloc.png',
        },
    };
    // create message to send to discord with file attachment
    const message: DiscordMessagePost = {
        embeds: [embed],
        components: [actionRow],
        attachments: [
            {
                filename: 'antrebloc.png',
                id: '0',
                description: 'antrebloc.png',
            },
        ],
    };

    const headers = new Headers();
    headers.append('Authorization', `Bot ${DISCORD_BOT_TOKEN}`);
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(message));
    const file = await getImage('images/antrebloc.png');
    formData.append('files[0]', file);

    // make request at discord api to send a message to the channel with the file attachment
    const reponse = (await fetch('https://discord.com/api/v8/channels/489476855657660436/messages', {
        method: 'POST',
        headers: headers,
        body: formData,
    }).then((res) => res.json())) as DiscordMessage;

    await putSession({
        id: reponse.id,
        date: date,
        location: location,
        participants: [member?.user.id as string],
    });

    const response: DiscordInteractionResponse = {
        type: DiscordInteractionResponseType.ChannelMessageWithSource,
        data: {
            content: 'La séance a été créée',
            flags: DiscordInteractionFlags.Ephemeral,
        },
    };
    return {
        statusCode: 200,
        body: JSON.stringify(response),
    };
}

async function inscription_handler(body: DiscordInteraction): Promise<APIGatewayProxyResult> {
    const { data, member } = body;

    const { options } = data as DiscordApplicationCommandData;

    await putUser({
        id: member?.user.id as string,
        firstName: options?.find((option) => option.name === 'prénom')?.value as string,
        lastName: options?.find((option) => option.name === 'nom')?.value as string,
        promo: options?.find((option) => option.name === 'promo')?.value as string,
        nbOfSeances: 0,
    });

    const response: DiscordInteractionResponse = {
        type: DiscordInteractionResponseType.ChannelMessageWithSource,
        data: {
            content: 'inscription done',
            flags: DiscordInteractionFlags.Ephemeral,
        },
    };

    return {
        statusCode: 200,
        body: JSON.stringify(response),
    };
}

export async function command_handler(body: DiscordInteraction): Promise<APIGatewayProxyResult | void> {
    const { data } = body;
    const { name } = data as DiscordApplicationCommandData;

    if (name === 'séance') {
        return await seance_handlher(body);
    } else if (name === 'activité') {
        return void 0;
    } else if (name === 'helloasso') {
        return void 0;
    } else if (name === 'inscription') {
        return await inscription_handler(body);
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
