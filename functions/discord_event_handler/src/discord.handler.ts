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
    DiscordComponent,
    DiscordModalSubmitData,
    DiscordComponentSubmit,
} from 'commons/discord.types';
import { getUser, listUsers, putUser } from 'commons/dynamodb.users';
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
import { IssueStatus, OrderRecord, OrderState, User } from 'commons/dynamodb.types';
import { getSecret } from 'commons/aws.secret';
import { getFile } from './s3.images';
import {
    editResponse,
    deferResponse,
    editResponseWithFile,
    editResponseWithFiles,
    updateButtonOfMessage,
} from './discord.interaction';
import { USER_NOT_FOUND_RESPONSE } from './discord.utils';
import { stringify } from 'csv-stringify';
import { fetchIssueExists, getIssue, listIssues, resolveIssue, updateIssue } from 'commons/dynamodb.issues';
import {
    fetchOrderExists,
    getOrders,
    getTicketsByOrderId,
    getUnsoldTickets,
    listOrders,
    listTickets,
    putOrder,
    validateOrders,
} from 'commons/dynamodb.tickets';
import {
    BUTTON_VIEW_ORDER_DETAILS,
    BUTTON_CANCEL_ORDER,
    BUTTON_MARK_ISSUE_PROCESSED,
    BUTTON_VIEW_TICKETS,
    FLAG_BUTTON_VIEW_ORDER_DETAILS,
    FLAG_BUTTON_CANCEL_ORDER,
    FLAG_BUTTON_MARK_ISSUE_PROCESSED,
    FLAG_BUTTON_VIEW_TICKETS,
    FLAG_BUTTON_MARK_ORDER_PROCESSED,
    BUTTON_MARK_ORDER_PROCESSED,
    FLAG_BUTTON_FETCH_TICKETS,
    BUTTON_FETCH_TICKETS,
} from 'commons/discord.components';
import { cancelPaiementOfOrder, getOrderDetails } from 'commons/helloasso.request';

const SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/discord_bot_token';
const HELLO_ASSO_SECRET_PATH = 'Efrei-Sport-Climbing-App/secrets/helloasso_client_secret';
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const CHANNELS: { [key: string]: string } = {
    antrebloc: process.env.ANTREBLOC_CHANNEL as string,
    'climb-up': process.env.CLIMBUP_CHANNEL as string,
    'climb-up-bordeaux': process.env.CLIMBUP_BORDEAUX_CHANNEL as string,
};

function streamToString(stream: any): Promise<string> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err: any) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

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

const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
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
        label: 'Rejoindre',
        custom_id: 'register',
    };
    const button2: DiscordButton = {
        type: DiscordComponentType.Button,
        style: DiscordButtonStyle.Danger,
        label: 'Se désinscrire',
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
    const file = await getFile(`images/${location}.png`);
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

    console.log('Creating session for date:', date, 'and location:', location);
    const session = await findSession(date, location).catch(() => undefined);
    console.log('Session found:', session);

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
    from.setMonth(month, 1);
    from.setHours(0, 0, 0, 0);

    const to = new Date();
    to.setMonth(month + 1, 1);
    to.setHours(0, 0, 0, 0);

    if (from > today) {
        from.setFullYear(today.getFullYear() - 1);
        if (to.getMonth() !== 0) {
            to.setFullYear(today.getFullYear() - 1);
        } else {
            to.setFullYear(today.getFullYear());
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

async function statement_handler(body: DiscordInteraction): Promise<[DiscordMessagePost, Blob, string]> {
    const { options } = body.data as DiscordApplicationCommandData;

    const from = parseDate(options?.find((option) => option.name === 'depuis')?.value as string);
    const to = parseDate(options?.find((option) => option.name === 'a')?.value as string);

    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error('Invalid date');
    }
    if (from > to) {
        throw new Error('Invalid date range');
    }

    const users = await listUsers();

    for (const user of users) {
        const number = await countSessionsWithUser(user.id as string, from, to);
        user.nbOfSeances = number;
    }

    const data = users.map((user) => {
        return [user.firstName, user.lastName, user.promo, user.nbOfSeances];
    });
    // create csv file with users
    const formatedData = stringify(data, {
        header: true,
        columns: ['Prénom', 'Nom', 'Promo', 'Nombre de séances'],
    });
    // to string
    const formatedDataString = await streamToString(formatedData);
    const blob = new Blob([formatedDataString], { type: 'text/csv' });

    const fromString = from.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const toString = to.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    let text_message =
        '__Voici le bilan des séances de grimpe :__\n\n' +
        users
            .sort((a, b) => (b.nbOfSeances as number) - (a.nbOfSeances as number))
            .map(
                (user) =>
                    `- **${user.firstName} ${user.lastName}** promo *${user.promo}* : **${user.nbOfSeances}** séance${
                        (user.nbOfSeances as number) > 1 ? 's' : ''
                    }`,
            )
            .join('\n') +
        `\n\nEntre le **${fromString}** et le **${toString}**.`;

    // check if text message is too long
    if (text_message.length > 2000) {
        text_message = 'Le message est trop long, veuillez consulter le fichier ci-dessous.';
    }

    const response: DiscordMessagePost = {
        content: text_message,
    };

    return [response, blob, `bilan_${fromString}_${toString}.csv`];
}

async function listIssues_handler(body: DiscordInteraction, pre_index: any | null = null): Promise<DiscordMessagePost> {
    const { options } = body.data as DiscordApplicationCommandData;
    let open_only = options?.find((option) => option.name === 'open_only')?.value as any as boolean;
    const limit = 10; // Default limit for pagination

    const lastEvaluatedKey = pre_index && JSON.parse(Buffer.from(pre_index, 'base64').toString('utf8'));
    if (
        lastEvaluatedKey &&
        lastEvaluatedKey.open_only !== undefined &&
        typeof lastEvaluatedKey.open_only === 'boolean'
    ) {
        // If open_only is present in the index, use it
        open_only = lastEvaluatedKey.open_only;
    }

    const [issues, index] = await listIssues(open_only, limit, lastEvaluatedKey);

    const embed: DiscordEmbed = {
        title: 'Liste des issues',
        description: issues.length > 0 ? '' : 'Aucune issue trouvée.',
        color: issues.length > 0 ? 15844367 : 3066993, // Red for issues, Green for no issues
        fields: issues.slice(0, limit).map((issue) => {
            return {
                name: `Issue #${issue.id} - ${issue.status}` + (issue.status === IssueStatus.CLOSED ? ' ✅' : ''),
                value: `**Description :** ${issue.description}\n**Créée le :** ${issue.createdAt.toLocaleDateString(
                    'fr-FR',
                )}\n**Modifiée le :** ${issue.updatedAt ? issue.updatedAt.toLocaleDateString('fr-FR') : 'Jamais'}`,
                inline: false,
            };
        }),
    };
    const response: DiscordMessagePost = {
        embeds: [embed],
    };
    if (issues.length > 0) {
        response.components = [
            {
                type: DiscordComponentType.ActionRow,
                components: [
                    {
                        type: DiscordComponentType.SelectMenu,
                        custom_id: 'view_issues',
                        options: issues.slice(0, limit).map((issue) => ({
                            label: `Issue #${issue.id} - ${issue.status}`,
                            value: issue.id,
                            description: issue.description.slice(0, 97) + (issue.description.length > 97 ? '...' : ''),
                        })),
                    } as DiscordComponent,
                ],
            },
        ];
        if (index) {
            index.open_only = open_only; // Add open_only to index for pagination
            const index_64 = Buffer.from(JSON.stringify(index)).toString('base64');
            if (index_64.length > 88) {
                console.error('Index too long for custom_id:', index_64);
            } else {
                const button: DiscordButton = {
                    type: DiscordComponentType.Button,
                    style: DiscordButtonStyle.Primary,
                    label: 'Voir plus',
                    custom_id: `list_issues=${index_64}`,
                };
                response.components.push({
                    type: DiscordComponentType.ActionRow,
                    components: [button],
                } as DiscordActionRow);
            }
        }
    }

    return response;
}

async function status_handler(): Promise<DiscordMessagePost> {
    // This function give the status of the bot on helloasso
    // The number of tickets sold, the number of issues, the number of users, etc.
    // It will be used to display the status of the bot on discord
    // It will return a DiscordMessagePost object with the status of the bot
    const users = await listUsers();
    const [issues] = await listIssues(true);
    const tickets = await listTickets();

    const embed: DiscordEmbed = {
        title: 'Statut du bot',
        description: '',
        color: 0x1e90ff, // Light blue color
        fields: [
            {
                name: 'Utilisateurs',
                value: `${users.length} utilisateurs enregistrés`,
                inline: true,
            },
            {
                name: 'Issues ouvertes',
                value: `${issues.length} issues ouvertes`,
                inline: true,
            },
            {
                name: 'Tickets',
                value: `${tickets.filter((ticket) => ticket.sold).length} / ${tickets.length} tickets vendus`,
                inline: true,
            },
        ],
    };
    const components: DiscordActionRow[] = [
        {
            type: DiscordComponentType.ActionRow,
            components: [
                {
                    type: DiscordComponentType.Button,
                    style: DiscordButtonStyle.Primary,
                    label: 'Export orders',
                    custom_id: 'export_orders',
                } as DiscordButton,
            ],
        },
    ];

    return {
        embeds: [embed],
        components,
    };
}

async function showOrderDetails_handler(body: DiscordInteraction): Promise<DiscordMessagePost> {
    const { data } = body;
    const { options } = data as DiscordApplicationCommandData;

    const orderId = options?.find((option) => option.name === 'id')?.value as string;

    if (!orderId) {
        return {
            content: 'Veuillez fournir un ID de commande valide.',
        };
    }

    const orders = await getOrders(orderId);
    if (!orders || orders.length === 0) {
        return {
            content: "Commande non trouvée. Aucun ticket est associé à cet ordre d'achat.",
        };
    }

    const { HELLO_ASSO_CLIENT_ID, HELLO_ASSO_CLIENT_SECRET } = await getSecret(HELLO_ASSO_SECRET_PATH);

    // Get helloasso order details
    const orderData = await getOrderDetails(orderId, HELLO_ASSO_CLIENT_ID, HELLO_ASSO_CLIENT_SECRET);

    const nbOrderProcessed = orders.filter((order) => order.state === OrderState.PROCESSED).length;
    const nbOrderPending = orders.filter((order) => order.state === OrderState.PENDING).length;
    const nbOrderCancelled = orders.filter((order) => order.state === OrderState.CANCELLED).length;

    const embed: DiscordEmbed = {
        title: `Détails de la commande ${orderId}`,
        description:
            `**Date de la commande :** ${new Date(orderData.date).toLocaleDateString('fr-FR')}\n` +
            `**Montant total :** ${orderData.amount.total / 100} €\n` +
            `**Statut :** ` +
            `${nbOrderProcessed > 0 ? `${nbOrderProcessed} ticket(s) traité(s)` : ''}` +
            `${
                nbOrderPending > 0 ? `${nbOrderProcessed > 0 ? ' / ' : ''}${nbOrderPending} ticket(s) en attente` : ''
            }` +
            `${
                nbOrderCancelled > 0
                    ? `${
                          nbOrderProcessed > 0 || nbOrderPending > 0 ? ' / ' : ''
                      }${nbOrderCancelled} ticket(s) annulé(s)`
                    : ''
            }\n` +
            `**Nom :** ${orderData.payer.firstName} ${orderData.payer.lastName}\n` +
            `**Email :** ${orderData.payer.email}\n` +
            `**Achats :**\n` +
            orderData.items
                .map(
                    (item) =>
                        `- ${item.name} (${item.customFields
                            .map((field) => `${field.name}: ${field.answer}`)
                            .join(', ')})`,
                )
                .join('\n'),
    };

    return {
        embeds: [embed],
        components: [
            {
                type: DiscordComponentType.ActionRow,
                components: [BUTTON_VIEW_TICKETS(orderId)],
            },
        ],
    };
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
            // check if user is admin
            if (member)
                if (member?.roles.find((role) => role === process.env.DISCORD_ROLE_ADMIN_ID) === undefined) {
                    return await editResponse(body, {
                        content: "Vous n'avez pas les droits pour effectuer cette action",
                    });
                }
            try {
                const [res, file, filename] = await statement_handler(body);
                return await editResponseWithFile(body, res, file, filename);
            } catch (err: { message: string } | any) {
                console.error('Error generating statement:', err);
                return await editResponse(body, {
                    content: "Une erreur s'est produite lors de la génération du relevé : " + (err.message || err),
                });
            }
        } else if (name === 'issues') {
            // check if user is admin
            if (member)
                if (member?.roles.find((role) => role === process.env.DISCORD_ROLE_ADMIN_ID) === undefined) {
                    return await editResponse(body, {
                        content: "Vous n'avez pas les droits pour effectuer cette action",
                    });
                }
            const res = await listIssues_handler(body);
            return await editResponse(body, res);
        } else if (name === 'status') {
            // Make sure the user is an admin
            if (member) {
                if (member?.roles.find((role) => role === process.env.DISCORD_ROLE_ADMIN_ID) === undefined) {
                    return await editResponse(body, {
                        content: "Vous n'avez pas les droits pour effectuer cette action",
                    });
                }
            }

            const res = await status_handler();
            return await editResponse(body, res);
        } else if (name === 'commande') {
            console.log('Handling order command');
            const res = await showOrderDetails_handler(body);
            console.log('Order command response:', res);
            return await editResponse(body, res);
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
            field.value = `${field.value}\n- ${user.firstName} ${user.lastName}\n`;
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

function export_orders_handler(): DiscordInteractionResponse {
    return {
        type: DiscordInteractionResponseType.Modal,
        data: {
            title: 'Export des commandes',
            custom_id: 'export_orders_modal',
            components: [
                {
                    type: DiscordComponentType.ActionRow,
                    components: [
                        {
                            type: DiscordComponentType.StringInput,
                            custom_id: 'start_date',
                            label: 'Date de début (JJ-MM-AAAA)',
                            style: 1,
                            min_length: 10,
                            max_length: 10,
                            placeholder: 'JJ-MM-AAAA',
                            required: true,
                        },
                    ],
                },
                {
                    type: DiscordComponentType.ActionRow,
                    components: [
                        {
                            type: DiscordComponentType.StringInput,
                            custom_id: 'end_date',
                            label: 'Date de fin (JJ-MM-AAAA)',
                            style: 1,
                            min_length: 10,
                            max_length: 10,
                            placeholder: 'JJ-MM-AAAA',
                            required: true,
                        },
                    ],
                },
            ],
        },
    };
}

export async function button_handler(body: DiscordInteraction): Promise<APIGatewayProxyResult | void> {
    const { data } = body;
    const { custom_id } = data as DiscordMessageComponentData;

    if (custom_id === 'register' || custom_id === 'leave') {
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
    } else if (custom_id.startsWith('mark_order_processed=')) {
        const orderId = custom_id.split('=')[1];
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: DiscordInteractionResponseType.Modal,
                data: {
                    title: `Confirmer le traitement de la commande ?`,
                    custom_id: `confirm_mark_order_processed=${orderId}`,
                    components: [
                        {
                            type: DiscordComponentType.ActionRow,
                            components: [
                                {
                                    type: DiscordComponentType.StringInput,
                                    custom_id: 'CONFIRMER',
                                    label: 'Écrivez "CONFIRMER" pour valider',
                                    style: 1,
                                    min_length: 9,
                                    max_length: 9,
                                    placeholder: 'CONFIRMER',
                                    required: true,
                                },
                            ],
                        },
                    ],
                },
            }),
        };
    } else if (custom_id.startsWith('mark_issue_processed=')) {
        const issueId = custom_id.split('=')[1];
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: DiscordInteractionResponseType.Modal,
                data: {
                    title: `Confirmer le traitement du problème ?`,
                    custom_id: `confirm_mark_issue_processed=${issueId}`,
                    components: [
                        {
                            type: DiscordComponentType.ActionRow,
                            components: [
                                {
                                    type: DiscordComponentType.StringInput,
                                    custom_id: 'CONFIRMER',
                                    label: 'Écrivez "CONFIRMER" pour valider',
                                    style: 1,
                                    min_length: 9,
                                    max_length: 9,
                                    placeholder: 'CONFIRMER',
                                    required: true,
                                },
                            ],
                        },
                    ],
                },
            }),
        };
    } else if (custom_id.startsWith('view_tickets=')) {
        await deferResponse(body, true);
        const orderId = custom_id.split('=')[1];
        const tickets = await getTicketsByOrderId(orderId).catch((err) => {
            console.error(`Error fetching tickets for order ${orderId}:`, err);
            return [];
        });
        if (tickets.length === 0) {
            return await editResponse(body, {
                content: `Aucun ticket trouvé pour la commande ${orderId}.`,
            });
        }
        const ticketFiles = await Promise.all(
            tickets.map(async (ticket) => await getFile(ticket.url).catch(() => null)),
        );
        // If any ticket file is null, log an error and skip this user
        if (ticketFiles.some((file) => file === null)) {
            console.error(`Error fetching ticket files for order ${orderId}. Some files are missing.`);
            return await editResponse(body, {
                content: `Erreur lors de la récupération des tickets pour la commande ${orderId}.`,
            });
        }
        const ticketFilesEntries = ticketFiles.map((file, index) => ({
            filename: `ticket_${index + 1}.pdf`,
            file: file!,
        }));
        await editResponseWithFiles(
            body,
            {
                content: `Tickets pour la commande ${orderId} :`,
                attachments: ticketFiles.map((file, index) => ({
                    filename: `ticket_${index + 1}.pdf`,
                    id: index.toString(),
                    description: `Ticket ${index + 1}`,
                })),
            } as DiscordMessagePost,
            ticketFilesEntries,
        );
    } else if (custom_id.startsWith('view_order_details=')) {
        await deferResponse(body, true);
        const orderId = custom_id.split('=')[1];
        const orderDetails = await getIssue(orderId).catch((err) => {
            console.error(`Error fetching order details for order ${orderId}:`, err);
            return null;
        });
        if (!orderDetails) {
            return await editResponse(body, {
                content: `Aucun détail trouvé pour la commande ${orderId}.`,
            });
        }
        const embed: DiscordEmbed = {
            title: `Détails de la commande ${orderId}`,
            description: orderDetails.description || 'Aucun détail disponible.',
            fields: [
                {
                    name: 'Statut',
                    value: orderDetails.status || 'Aucun statut disponible.',
                    inline: true,
                },
                {
                    name: 'Date de création',
                    value: orderDetails.createdAt
                        ? new Date(orderDetails.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                          })
                        : 'Aucune date disponible.',
                    inline: true,
                },
                {
                    name: 'Date de mise à jour',
                    value: orderDetails.updatedAt
                        ? new Date(orderDetails.updatedAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                          })
                        : 'Aucune date disponible.',
                    inline: true,
                },
            ],
            color: orderDetails.status === IssueStatus.CLOSED ? 3066993 : 15844367,
        };
        if (orderDetails.order) {
            embed.fields?.push({
                name: 'Détails de la commande',
                value: `**Id** : ${orderDetails.order.id}\n**Montant** : ${
                    orderDetails.order.amount.total / 100
                } €\n**Date** : ${new Date(orderDetails.order.date).toLocaleDateString('fr-FR')}\n**Nom** : ${
                    orderDetails.order.payer.firstName
                } ${orderDetails.order.payer.lastName}\n**Email** : ${
                    orderDetails.order.payer.email
                }\n**Achats** :\n - ${
                    orderDetails.order.items
                        .slice(0, 5)
                        .map(
                            (item) =>
                                `${item.name} (${item.customFields
                                    .map((field) => field.name + ' ' + field.answer)
                                    .join(', ')})`,
                        )
                        .join('\n - ') + (orderDetails.order.items.length > 5 ? '\n - ...' : '')
                }`,
                inline: false,
            });
        }
        return await editResponse(body, {
            content: `Détails de la commande ${orderId} :`,
            embeds: [embed],
        });
    } else if (custom_id.startsWith('list_issues=')) {
        deferResponse(body, true);
        // update previous embed with new issues
        const index_64 = custom_id.split('=')[1];

        const update = await listIssues_handler(body, index_64);

        // call discord api to edit old message with new issues
        return await editResponse(body, update);
    } else if (custom_id.startsWith('cancel_order=')) {
        const orderId = custom_id.split('=')[1];
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: DiscordInteractionResponseType.Modal,
                data: {
                    title: `Confirmer l'annulation de la commande ${orderId} ?`,
                    custom_id: `confirm_cancel_order=${orderId}`,
                    components: [
                        {
                            type: DiscordComponentType.ActionRow,
                            components: [
                                {
                                    type: DiscordComponentType.StringInput,
                                    custom_id: 'CONFIRMER',
                                    label: 'Écrivez "CONFIRMER" pour valider',
                                    style: 1,
                                    min_length: 9,
                                    max_length: 9,
                                    placeholder: 'CONFIRMER',
                                    required: true,
                                },
                            ],
                        },
                    ],
                },
            }),
        };
    } else if (custom_id.startsWith('fetch_tickets=')) {
        const orderId = custom_id.split('=')[1];
        await deferResponse(body, true);

        const { DISCORD_BOT_TOKEN } = await getSecret(SECRET_PATH);

        if (await fetchOrderExists(orderId.toString())) {
            return await editResponse(body, {
                content: `Les tickets pour la commande ${orderId} ont déjà été attribués.`,
            });
        }

        const issue = await getIssue(orderId).catch((err) => {
            console.error(`Error fetching issue details for issue ${orderId}:`, err);
            return null;
        });

        if (!issue) {
            return await editResponse(body, {
                content: `Aucune issue trouvée pour la commande ${orderId}.`,
            });
        }

        const orderData = issue.order;
        if (!orderData) {
            return await editResponse(body, {
                content: `Aucune commande trouvée pour l'issue ${orderId}.`,
            });
        }

        const orderItems = orderData.items;
        if (!orderItems || orderItems.length === 0) {
            return await editResponse(body, {
                content: `Aucun article trouvé pour la commande ${orderId}.`,
            });
        } else if (orderItems.length > 10) {
            return await editResponse(body, {
                content: `La commande ${orderId} contient trop d'articles (${orderItems.length}). Veuillez annuler la commande et en créer une nouvelle.`,
            });
        }

        const tickets = await getUnsoldTickets(orderItems.length).catch((err) => {
            console.error('Error fetching unsold tickets:', err);
            return [];
        });

        if (!tickets || tickets.length < orderItems.length) {
            return await editResponse(body, {
                content: `Pas assez de tickets disponibles pour la commande ${orderId}. Veuillez contacter l'administrateur.`,
            });
        }

        // Get tickets from S3
        // Get file from s3
        const ticketFiles = await Promise.all(
            tickets.map(
                async (ticket) =>
                    await getFile(ticket.url).catch((err) => {
                        console.error(`Error fetching ticket file for ${ticket.url}:`, err);
                        return null;
                    }),
            ),
        );

        if (ticketFiles.some((file) => file === null)) {
            return await editResponse(body, {
                content: `Erreur lors de la récupération des fichiers de tickets pour la commande ${orderId}.`,
            });
        }

        // Assign tickets to order items
        for (const ticket of tickets) {
            // update ticket in db
            await putOrder(orderId.toString(), ticket.id);
        }

        await updateIssue(orderId.toString(), {
            flags: FLAG_BUTTON_VIEW_ORDER_DETAILS + FLAG_BUTTON_VIEW_TICKETS + FLAG_BUTTON_MARK_ORDER_PROCESSED,
        });

        await updateButtonOfMessage(body.channel_id as string, body.message?.id as string, orderId, DISCORD_BOT_TOKEN);

        // Return the tickets as a response
        const ticketFilesEntries = ticketFiles.map((file, index) => ({
            filename: `ticket_${index + 1}.pdf`,
            file: file!,
        }));

        return await editResponseWithFiles(
            body,
            {
                content: `Tickets pour la commande ${orderId} :`,
                attachments: ticketFiles.map((file, index) => ({
                    filename: `ticket_${index + 1}.pdf`,
                    id: index.toString(),
                    description: `Ticket ${index + 1}`,
                })),
            } as DiscordMessagePost,
            ticketFilesEntries,
        );
    } else if (custom_id === 'export_orders') {
        const res = export_orders_handler();

        // open modal to select date range
        return {
            statusCode: 200,
            body: JSON.stringify(res),
        };
    } else {
        console.error(`Unknown custom_id: ${custom_id}`);
        return {
            statusCode: 400,
            body: JSON.stringify({
                content: 'Unknown action',
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }
}

export async function select_menu_handler(body: DiscordInteraction): Promise<APIGatewayProxyResult | void> {
    const { data } = body;
    const { custom_id } = data as DiscordMessageComponentData;

    if (custom_id === 'view_issues') {
        await deferResponse(body, true);
        const issueId = (data as DiscordMessageComponentData).values?.[0];

        if (!issueId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    content: "Aucun ID d'issue sélectionné.",
                }),
            };
        }

        const issue = await getIssue(issueId).catch((err) => {
            console.error(`Error fetching issue ${issueId}:`, err);
            return null;
        });

        if (!issue) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    content: `Issue ${issueId} non trouvée.`,
                }),
            };
        }

        const embed: DiscordEmbed = {
            title: `Détails de l'issue #${issue.id}`,
            description: issue.description || 'Aucune description disponible.',
            color: issue.status === IssueStatus.CLOSED ? 3066993 : 0xff0000,
            fields: [
                {
                    name: 'Statut',
                    value: issue.status || 'Aucun statut disponible.',
                    inline: true,
                },
                {
                    name: 'Créée le',
                    value: issue.createdAt
                        ? new Date(issue.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                          })
                        : 'Aucune date disponible.',
                    inline: true,
                },
                {
                    name: 'Modifiée le',
                    value: issue.updatedAt
                        ? new Date(issue.updatedAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                          })
                        : 'Jamais modifiée.',
                    inline: true,
                },
            ],
        };

        // Add buttons for issue actions depending on flags and status
        const actionRow: DiscordActionRow = {
            type: DiscordComponentType.ActionRow,
            components: [],
        };
        if (issue.flags === undefined) {
            issue.flags = 0; // Ensure flags is defined
        }
        if (issue.flags & FLAG_BUTTON_VIEW_ORDER_DETAILS) {
            actionRow.components.push(BUTTON_VIEW_ORDER_DETAILS(issue.id));
        }
        if (issue.flags & FLAG_BUTTON_CANCEL_ORDER && issue.status !== IssueStatus.CLOSED) {
            actionRow.components.push(BUTTON_CANCEL_ORDER(issue.id));
        }
        if (issue.flags & FLAG_BUTTON_VIEW_TICKETS && issue.status !== IssueStatus.CLOSED) {
            actionRow.components.push(BUTTON_VIEW_TICKETS(issue.id));
        }
        if (issue.flags & FLAG_BUTTON_MARK_ISSUE_PROCESSED && issue.status !== IssueStatus.CLOSED) {
            actionRow.components.push(BUTTON_MARK_ISSUE_PROCESSED(issue.id));
        }
        if (issue.flags & FLAG_BUTTON_MARK_ORDER_PROCESSED && issue.status !== IssueStatus.CLOSED) {
            actionRow.components.push(BUTTON_MARK_ORDER_PROCESSED(issue.id));
        }
        if (issue.flags & FLAG_BUTTON_FETCH_TICKETS && issue.status !== IssueStatus.CLOSED) {
            actionRow.components.push(BUTTON_FETCH_TICKETS(issue.id));
        }

        return await editResponse(body, {
            embeds: [embed],
            components: actionRow.components.length > 0 ? [actionRow] : [],
        });
    }

    return {
        statusCode: 400,
        body: JSON.stringify({
            content: `Unknown select menu action: ${custom_id}`,
        }),
    };
}

async function export_order_handler(body: DiscordInteraction): Promise<[DiscordMessagePost, Blob, string]> {
    const { data } = body as { data: DiscordModalSubmitData } & DiscordInteraction;

    const startDateString = (
        (data.components[0] as { components: DiscordComponentSubmit[] })?.components[0] as { value: string }
    ).value;
    const endDateString = (
        (data.components[1] as { components: DiscordComponentSubmit[] })?.components[0] as { value: string }
    ).value;

    const startDate = parseDate(startDateString);
    const endDate = parseDate(endDateString);
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format. Please use JJ-MM-AAAA.');
    }
    if (startDate > endDate) {
        throw new Error('La date de début doit être antérieure à la date de fin.');
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const orders: OrderRecord[] = await listOrders(startDate, endDate);
    if (orders.length === 0) {
        return [
            {
                content: 'Aucune commande trouvée pour cette période.',
            },
            new Blob(),
            '',
        ];
    }

    // build CSV data
    // col 1: Order ID
    // col 2: Payer Name
    // col 3: Payer Email
    // col 4: Order Date
    // col 5: Order Amount
    // col 6: Order Items in JSON format
    // col 7: Order State
    const csv_data = orders.map((order) => {
        return [order.orderId, order.date.toLocaleString('fr-FR'), order.ticketId, order.state];
    });

    const formatedData = stringify(csv_data, {
        header: true,
        columns: ['Order ID', 'Order Date', 'Ticket ID', 'Order State'],
    });
    const formatedDataString = await streamToString(formatedData);

    const blob = new Blob([formatedDataString], { type: 'text/csv' });
    const fileName = `orders_${startDateString}_${endDateString}.csv`;

    return [
        {
            content: 'Voici votre fichier CSV contenant les commandes.',
        },
        blob,
        fileName,
    ];
}

export async function modal_handler(body: DiscordInteraction): Promise<APIGatewayProxyResult | void> {
    const { data } = body as { data: DiscordModalSubmitData } & DiscordInteraction;
    const { custom_id } = data;

    const { DISCORD_BOT_TOKEN } = await getSecret(SECRET_PATH);

    if (custom_id === 'export_orders_modal') {
        await deferResponse(body, true);

        try {
            const [res, file, filename] = await export_order_handler(body);
            return await editResponseWithFile(body, res, file, filename);
        } catch (err: any) {
            console.error('Error exporting orders:', err);
            return await editResponse(body, {
                content: `Une erreur s'est produite lors de l'export des commandes : ${err.message || err}`,
            });
        }
    } else if (custom_id.startsWith('confirm_mark_issue_processed=')) {
        await deferResponse(body, false);
        const issueId = custom_id.split('=')[1];

        if (!fetchIssueExists(issueId)) {
            return await editResponse(body, {
                content: `La commande ${issueId} n'existe pas.`,
            });
        }
        const orders = await getOrders(issueId);
        if (orders && orders.length !== 0) {
            return await editResponse(body, {
                content: `Le problème ${issueId} est associé à des commandes. Veuillez marquer les commandes comme traitées avant de marquer le problème comme traité.`,
            });
        }
        await resolveIssue(issueId);

        await updateIssue(issueId.toString(), {
            flags: FLAG_BUTTON_VIEW_ORDER_DETAILS,
        });

        await updateButtonOfMessage(body.channel_id as string, body.message?.id as string, issueId, DISCORD_BOT_TOKEN);

        const embed: DiscordEmbed = {
            title: `Problème ${issueId} traité`,
            description: `Le problème ${issueId} a été marqué comme traité par <@${body.member?.user.id}>.`,
            color: 3066993,
            fields: [
                {
                    name: 'Statut',
                    value: 'Traitée',
                    inline: true,
                },
                {
                    name: 'Date de traitement',
                    value: new Date().toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                    inline: true,
                },
            ],
        };
        return await editResponse(body, {
            embeds: [embed],
        });
    } else if (custom_id.startsWith('confirm_mark_order_processed=')) {
        await deferResponse(body, false);
        const orderId = custom_id.split('=')[1];
        if (!fetchIssueExists(orderId)) {
            return await editResponse(body, {
                content: `La commande ${orderId} n'existe pas.`,
            });
        }
        const orders = await getOrders(orderId);
        if (!orders || orders.length === 0) {
            return await editResponse(body, {
                content: `La commande ${orderId} n'est associée à aucun ticket. Veuillez associer un/des ticket(s) à cette commande avant de la marquer comme traitée.`,
            });
        }
        await resolveIssue(orderId);
        await validateOrders(orderId);

        await updateIssue(orderId.toString(), {
            flags: FLAG_BUTTON_VIEW_ORDER_DETAILS,
        });

        await updateButtonOfMessage(body.channel_id as string, body.message?.id as string, orderId, DISCORD_BOT_TOKEN);
        const embed: DiscordEmbed = {
            title: `Commande ${orderId} traitée`,
            description: `La commande ${orderId} a été marquée comme traitée par <@${body.member?.user.id}>.`,
            color: 3066993,
            fields: [
                {
                    name: 'Statut',
                    value: 'Traitée',
                    inline: true,
                },
                {
                    name: 'Date de traitement',
                    value: new Date().toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                    inline: true,
                },
            ],
        };
        return await editResponse(body, {
            embeds: [embed],
        });
    } else if (custom_id.startsWith('confirm_cancel_order=')) {
        await deferResponse(body, false);
        const orderId = custom_id.split('=')[1];
        if (!fetchIssueExists(orderId)) {
            return await editResponse(body, {
                content: `La commande ${orderId} n'existe pas.`,
            });
        }
        const orders = await getOrders(orderId);
        if (orders && orders.length !== 0) {
            return await editResponse(body, {
                content: `La commande ${orderId} est associée à un ou plusieurs tickets. Veuillez annuler les tickets associés avant d'annuler la commande.`,
            });
        }
        const { HELLO_ASSO_CLIENT_ID, HELLO_ASSO_CLIENT_SECRET } = await getSecret(HELLO_ASSO_SECRET_PATH);
        return await cancelPaiementOfOrder(orderId, HELLO_ASSO_CLIENT_ID, HELLO_ASSO_CLIENT_SECRET).then(
            async () => {
                await updateIssue(orderId, {
                    status: IssueStatus.CLOSED,
                    description: `La commande ${orderId} a été annulée par <@${body.member?.user.id}>.`,
                });

                await updateIssue(orderId.toString(), {
                    flags: FLAG_BUTTON_VIEW_ORDER_DETAILS,
                });

                await updateButtonOfMessage(
                    body.channel_id as string,
                    body.message?.id as string,
                    orderId,
                    DISCORD_BOT_TOKEN,
                );
                const embed: DiscordEmbed = {
                    title: `Commande ${orderId} annulée`,
                    description: `La commande ${orderId} a été annulée par <@${body.member?.user.id}>.`,
                    color: 16753920, // light orange ,
                    fields: [
                        {
                            name: 'Statut',
                            value: 'Annulée',
                            inline: true,
                        },
                        {
                            name: "Date d'annulation",
                            value: new Date().toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            }),
                            inline: true,
                        },
                    ],
                };
                return await editResponse(body, {
                    embeds: [embed],
                });
            },
            (err: any) => {
                console.error(`Error canceling order ${orderId}:`, err);
                return editResponse(body, {
                    content: `Une erreur s'est produite lors de l'annulation de la commande ${orderId} : ${
                        err.message || err
                    }`,
                });
            },
        );
    }
}
