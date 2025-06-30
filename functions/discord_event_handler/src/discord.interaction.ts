import {
    DiscordInteraction,
    DiscordInteractionResponseType,
    DiscordInteractionFlags,
    DiscordMessagePost,
} from 'commons/discord.types';

export async function deferResponse(body: DiscordInteraction, ephemeral = false) {
    fetch('https://discord.com/api/v8/interactions/' + body.id + '/' + body.token + '/callback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: DiscordInteractionResponseType.DeferredChannelMessageWithSource,
            data: {
                flags: ephemeral ? DiscordInteractionFlags.Ephemeral : 0,
            },
        }),
    });
}

export async function editResponse(body: DiscordInteraction, message: DiscordMessagePost) {
    await fetch(
        'https://discord.com/api/v8/webhooks/' + process.env.DISCORD_APP_ID + '/' + body.token + '/messages/@original',
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        },
    ).then((response) => {
        console.log('Response status:', response.status);
    });
}

export async function editResponseWithFile(
    body: DiscordInteraction,
    message: DiscordMessagePost,
    file: Blob,
    filename: string,
) {
    const formData = new FormData();
    message.attachments = [];
    formData.append('payload_json', JSON.stringify(message));
    formData.append('file[0]', file, filename);
    await fetch(
        'https://discord.com/api/v8/webhooks/' + process.env.DISCORD_APP_ID + '/' + body.token + '/messages/@original',
        {
            method: 'PATCH',
            body: formData,
        },
    );
}

export async function editResponseWithFiles(
    body: DiscordInteraction,
    message: DiscordMessagePost,
    files: { filename?: string; file: Blob }[],
) {
    const formData = new FormData();
    message.attachments = [];
    formData.append('payload_json', JSON.stringify(message));
    files.forEach((file, index) => {
        const filename = file.filename || `file_${index + 1}`;
        formData.append(`files[${index}]`, file.file, filename);
    });
    await fetch(
        'https://discord.com/api/v8/webhooks/' + process.env.DISCORD_APP_ID + '/' + body.token + '/messages/@original',
        {
            method: 'PATCH',
            body: formData,
        },
    );
}
