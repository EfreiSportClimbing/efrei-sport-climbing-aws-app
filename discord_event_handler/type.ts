export type DiscordUser = {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
    public_flags: number;
};

export type DiscordGuildMember = {
    user: DiscordUser;
    roles: string[];
    premium_since: string;
    permissions: string;
    pending: boolean;
    nick: string;
    mute: boolean;
    joined_at: string;
    is_pending: boolean;
    deaf: boolean;
};

export type DiscordMessage = {
    id: string;
    channel_id: string;
    author: DiscordUser;
    content: string;
    timestamp: string;
    edited_timestamp: string;
    tts: boolean;
    mention_everyone: boolean;
    mentions: DiscordUser[];
    mention_roles: string[];
    mention_channels: string[];
    attachments: string[];
    embeds: string[];
    reactions?: string[];
    nonce?: string | number;
    pinned: boolean;
    webhook_id?: string;
    type: number;
    activity?: string;
    application?: string;
    application_id?: string;
    message_reference?: string;
    flags?: number;
    referenced_message?: DiscordMessage;
    interaction?: string;
    thread?: string;
    components?: string[];
    sticker_items?: string[];
    stickers?: string[];
    position?: number;
    role_subscription_data?: string;
};

export type DiscordInteractionData = {
    id: string;
    name: string;
    type: number;
    options?: {
        name: string;
        value: string;
    }[];
    guild_id?: string;
    channel_id?: string;
};

export type DiscordInteraction = {
    id: string;
    application_id: string;
    type: number;
    data?: DiscordInteractionData;
    guild_id?: string;
    channel_id?: string;
    member?: DiscordGuildMember;
    user?: DiscordUser;
    token: string;
    version: number;
    message?: DiscordMessage;
    app_permissions?: string;
    locale?: string;
    guild_locale?: string;
};

export type DiscordComponent = {
    type: number;
    style?: number;
    label?: string;
    emoji?: string;
    disabled?: boolean;
    url?: string;
    custom_id?: string;
    options?: string[];
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    components?: string[];
};

export type DiscordAttachment = {
    id: string;
    filename: string;
    description?: string;
    content_type?: string;
    size: number;
    url: string;
    proxy_url: string;
    height?: number;
    width?: number;
    ephemeral?: boolean;
};

export type DiscordEmbed = {
    title?: string;
    type?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    footer?: {
        text?: string;
        icon_url?: string;
        proxy_icon_url?: string;
    };
    image?: {
        url?: string;
        proxy_url?: string;
        height?: number;
        width?: number;
    };
    thumbnail?: {
        url?: string;
        proxy_url?: string;
        height?: number;
        width?: number;
    };
    video?: {
        url?: string;
        height?: number;
        width?: number;
    };
    provider?: {
        name?: string;
        url?: string;
    };
    author?: {
        name?: string;
        url?: string;
        icon_url?: string;
        proxy_icon_url?: string;
    };
    fields?: {
        name?: string;
        value?: string;
        inline?: boolean;
    }[];
};

export type DiscordInteractionResponse = {
    type: number;
    data?: {
        tts?: boolean;
        content?: string;
        embeds?: DiscordEmbed[];
        allowed_mentions?: string[];
        flags?: number;
    };
    options?: {
        ephemeral?: boolean;
    };
    components?: DiscordComponent[];
    attachments?: DiscordAttachment[];
};
