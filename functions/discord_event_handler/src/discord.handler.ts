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
    DiscordGuildMember,
} from 'commons/discord.types';
import { getUser, putUser } from 'commons/dynamodb.users';
import {
    addUserToSession,
    countParticipants,
    countSessionsWithUser,
    deleteSession,
    findSession,
    getSession,
    putSession,
    removeUserFromSession,
} from 'commons/dynamodb.sessions';
import { User } from 'commons/dynamodb.types';
import { getSecret } from 'commons/discord.secret';
import { getImage } from './s3.images';
import { editResponse, deferResponse } from './discord.interaction';
import { USER_NOT_FOUND_RESPONSE } from './discord.utils';

const SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/discord_bot_token';
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const CHANNELS: { [key: string]: string } = {
    antrebloc: process.env.ANTREBLOC_CHANNEL as string,
    'climb-up': process.env.CLIMBUP_CHANNEL as string,
    arkose: process.env.ARKOSE_CHANNEL as string,
};

const generateDate = (day: string, hour: string) => {
    //generate date from command
    const date = new Date();

    const daytoset = DAYS.indexOf(day);
    const currentDay = date.getDay();
    const distance = (daytoset + 7 - currentDay) % 7;
    console.log(distance, day, daytoset, currentDay);
    date.setDate(date.getDate() + distance);

    hour = hour.split('h')[0];
    date.setHours(parseInt(hour));
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
};

async function create_seance(
    user: User,
    member: DiscordGuildMember,
    date: Date,
    location: string,
): Promise<DiscordMessagePost> {
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
                value: `- ${user.firstName} ${user.lastName}\n`,
                inline: false,
            },
        ],
        author: {
            name: user.firstName + ' ' + user.lastName,
            icon_url: member?.user.avatar
                ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${member?.user.discriminator}.png`,
            url: 'https://discord.com/users/' + member.user.id,
        },
        color: 15844367,
        thumbnail: {
            url: `attachment://${location}.png`,
        },
    };
    // create message to send to discord with file attachment
    const message: DiscordMessagePost = {
        embeds: [embed],
        components: [actionRow],
        attachments: [
            {
                filename: `${location}.png`,
                id: '0',
                description: 'image',
            },
        ],
    };

    const headers = new Headers();
    headers.append('Authorization', `Bot ${DISCORD_BOT_TOKEN}`);
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(message));
    const file = await getImage(`images/${location}.png`);
    formData.append('files[0]', file);

    // make request at discord api to send a message to the channel with the file attachment
    const reponse = (await fetch('https://discord.com/api/v8/channels/' + CHANNELS[location] + '/messages', {
        method: 'POST',
        headers: headers,
        body: formData,
    }).then((res) => res.json())) as DiscordMessage;

    await putSession(
        {
            id: reponse.id,
            date: date,
            location: location,
        },
        [user.id],
    );

    const dayString = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
    });

    const hourString = date.toLocaleTimeString('fr-FR', {
        hour: 'numeric',
    });

    return {
        content: `Ajout d'une séance de grimpe à **${
            location.charAt(0).toUpperCase() + location.slice(1)
        }** le **${dayString}** à **${hourString}**.`,
    };
}

async function seance_handlher(body: DiscordInteraction, user: User): Promise<DiscordMessagePost> {
    const { member } = body;
    const { data } = body;
    const { options } = data as DiscordApplicationCommandData;

    const day = options?.find((option) => option.name === 'date')?.value as string;
    const hour = options?.find((option) => option.name === 'heure')?.value as string;
    const location = options?.find((option) => option.name === 'salle')?.value as string;

    const date = generateDate(day, hour);

    const session = await findSession(date, location).catch(() => {
        return undefined;
    });

    if (session) {
        const { DISCORD_BOT_TOKEN } = await getSecret(SECRET_PATH);
        const message = await fetch(
            `https://discord.com/api/v8/channels/${CHANNELS[location]}/messages/${session.id}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                },
            },
        )
            .then((res) => res.json())
            .then((res) => res as DiscordMessage);
        const res = await add_to_session_handler(message, user);
        return res;
    } else {
        const response = await create_seance(user, member as DiscordGuildMember, date, location);
        return response;
    }
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

async function activity_handler(body: DiscordInteraction, user: User): Promise<DiscordMessagePost> {
    const { options } = body.data as DiscordApplicationCommandData;

    const month = parseInt(options?.find((option) => option.name === 'mois')?.value as string);

    const today = new Date();

    const from = new Date();
    from.setMonth(month);
    from.setHours(0, 0, 0, 0);

    const to = new Date();
    to.setMonth(month + 1);
    to.setHours(0, 0, 0, 0);

    if (from > today) {
        from.setFullYear(today.getFullYear() - 1);
        if (to.getMonth() !== 0) {
            to.setFullYear(today.getFullYear() - 1);
        }
    }

    const number = await countSessionsWithUser(user.id as string, from, to);

    const fromString = from.toLocaleDateString('fr-FR', {
        month: 'long',
    });

    const toString = to.toLocaleDateString('fr-FR', {
        month: 'long',
    });

    const yearFromString = from.toLocaleDateString('fr-FR', {
        year: 'numeric',
    });

    const yearToString = to.toLocaleDateString('fr-FR', {
        year: 'numeric',
    });

    const response: DiscordMessagePost = {
        content: `Vous avez participé à ${number} séances de grimpe de ${fromString} ${yearFromString} à ${toString} ${yearToString}.`,
    };

    return response;
}

async function helloasso_handler(body: DiscordInteraction, user: User): Promise<DiscordMessagePost> {
    const response: DiscordMessagePost = {
        content: `Votre identifiant HelloAsso est : ${user.id}`,
    };

    return response;
}

export async function command_handler(body: DiscordInteraction): Promise<APIGatewayProxyResult | void> {
    const { data, member } = body;
    const { name } = data as DiscordApplicationCommandData;

    if (name === 'inscription') {
        return await inscription_handler(body);
    } else {
        await deferResponse(body, true);
        const user = await getUser(member?.user.id as string).catch(() => undefined);
        if (!user) {
            return await editResponse(body, USER_NOT_FOUND_RESPONSE);
        }
        if (name === 'activité') {
            const res = await activity_handler(body, user);
            return await editResponse(body, res);
        } else if (name === 'helloasso') {
            const res = await helloasso_handler(body, user);
            return await editResponse(body, res);
        } else if (name === 'séance') {
            const res = await seance_handlher(body, user);
            return await editResponse(body, res);
        } else if (name === 'relevé') {
            return void 0;
        }
    }
}

async function remove_from_session_handler(body: DiscordInteraction, user: User): Promise<DiscordMessagePost> {
    const { message } = body;
    const { DISCORD_BOT_TOKEN } = await getSecret(SECRET_PATH);

    try {
        await removeUserFromSession(message?.id as string, body.member?.user.id as string);
    } catch (err) {
        return {
            content: "Vous n'êtes pas inscrit à cette séance",
        };
    }
    const session = await getSession(message?.id as string).catch((err) => {
        console.log(err);
        return;
    });
    if (!session) {
        return {
            content: "Cette séance n'existe plus",
        };
    }
    const nbParticipants = await countParticipants(message?.id as string);
    if (nbParticipants === 0) {
        await deleteSession(body.message?.id as string);
        await fetch(`https://discord.com/api/v8/channels/${body.channel_id}/messages/${body.message?.id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            },
        });
        return { content: 'La séance a été supprimée.' };
    } else {
        // edit embed
        const message = (await fetch(
            `https://discord.com/api/v8/channels/${body.channel_id}/messages/${body.message?.id}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                },
            },
        ).then((res) => res.json())) as DiscordMessage;
        const embed = message.embeds[0];
        const location = session.location;
        const field = embed.fields?.filter((field) => field.name === 'Participants :')[0];
        embed.thumbnail = { url: `attachment://${location}.png` };

        if (field) {
            field.value = field.value?.replace(`- ${user.firstName} ${user.lastName}`, '');
            field.value = field.value?.replace('\n\n', '\n');
        }

        await fetch(`https://discord.com/api/v8/channels/${body.channel_id}/messages/${body.message?.id}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed],
            }),
        });
        return { content: 'Vous avez été retiré de la séance.' };
    }
}

async function add_to_session_handler(message: DiscordMessage, user: User): Promise<DiscordMessagePost> {
    const { DISCORD_BOT_TOKEN } = await getSecret(SECRET_PATH);

    try {
        await addUserToSession(message?.id as string, user.id as string);
    } catch (err: any) {
        return {
            content: 'Vous êtes déjà inscrit à cette séance',
        };
    }
    const session = await getSession(message?.id as string).catch((err) => {
        console.log(err);
        return;
    });

    if (!session) {
        return {
            content: "Cette séance n'existe plus",
        };
    } else {
        const location = session.location;
        const embed = message.embeds[0];
        const field = embed.fields?.filter((field) => field.name === 'Participants :')[0];
        embed.thumbnail = { url: `attachment://${location}.png` };

        if (field) {
            field.value = `${field.value}\n - ${user.firstName} ${user.lastName}\n`;
            field.value = field.value?.replace('\n\n', '\n');
        } else {
            return {
                content: "Une erreur s'est produite",
            };
        }
        await fetch(`https://discord.com/api/v8/channels/${CHANNELS[location]}/messages/${message.id}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed],
            } as DiscordMessagePost),
        });
        return { content: 'Vous avez été ajouté à la séance.' };
    }
}

export async function button_handler(body: DiscordInteraction): Promise<APIGatewayProxyResult | void> {
    const { data } = body;
    const { custom_id } = data as DiscordMessageComponentData;

    await deferResponse(body, true);
    const user = await getUser(body.member?.user.id as string).catch(() => undefined);
    if (!user) {
        await editResponse(body, USER_NOT_FOUND_RESPONSE);
        return;
    }

    if (custom_id === 'register') {
        const response = await add_to_session_handler(body.message as DiscordMessage, user);
        await editResponse(body, response);
    } else if (custom_id === 'leave') {
        const response = await remove_from_session_handler(body, user);
        await editResponse(body, response);
    }
}
