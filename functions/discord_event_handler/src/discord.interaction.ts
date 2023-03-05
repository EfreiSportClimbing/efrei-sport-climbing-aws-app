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
    );
}
