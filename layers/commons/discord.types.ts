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
    embeds: DiscordEmbed[];
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

export type DiscordApplicationCommandData = {
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

export type DiscordMessageComponentData = {
    custom_id: string;
    component_type: number;
    values?: any[];
};

export type DiscordInteraction = {
    id: string;
    application_id: string;
    type: DiscordInteractionType;
    data?: DiscordApplicationCommandData | DiscordMessageComponentData;
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

export enum DiscordButtonStyle {
    Primary = 1,
    Secondary = 2,
    Success = 3,
    Danger = 4,
    Link = 5,
}

export enum DiscordComponentType {
    ActionRow = 1,
    Button = 2,
    SelectMenu = 3,
    StringInput = 4,
    UserInput = 5,
    RoleInput = 6,
    MentionableInput = 7,
    ChannelInput = 8,
}

export type SelectOption = {
    label: string;
    value: string;
    description?: string;
    emoji?: {
        id?: string;
        name?: string;
        animated?: boolean;
    };
    default?: boolean;
};

export type DiscordComponent = {
    type: DiscordComponentType;
    style?: DiscordButtonStyle;
    label?: string;
    emoji?: string;
    disabled?: boolean;
    url?: string;
    custom_id?: string;
    options?: (string | SelectOption)[];
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    components?: DiscordComponent[];
};

export type DiscordButton = {
    type: DiscordComponentType.Button;
    style: DiscordButtonStyle;
    label: string;
    emoji?: string;
    disabled?: boolean;
    url?: string;
    custom_id?: string;
};

export type DiscordActionRow = {
    type: DiscordComponentType.ActionRow;
    components: DiscordComponent[];
};

export type DiscordAttachment = {
    id: string;
    filename: string;
    description?: string;
    content_type?: string;
    size?: number;
    url?: string;
    proxy_url?: string;
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

export enum DiscordInteractionResponseType {
    Pong = 1,
    Acknowledge = 2,
    ChannelMessageNoSource = 3,
    ChannelMessageWithSource = 4,
    DeferredChannelMessageWithSource = 5,
    DeferredUpdateMessage = 6,
    UpdateMessage = 7,
    ApplicationCommandAutocompleteResult = 8,
    Modal = 9,
}

export enum DiscordInteractionType {
    Ping = 1,
    ApplicationCommand = 2,
    MessageComponent = 3,
    ApplicationCommandAutocomplete = 4,
    ModalSubmit = 5,
}

export enum DiscordInteractionFlags {
    Ephemeral = 64,
}

export type DiscordInteractionResponse = {
    type: DiscordInteractionResponseType;
    data?: {
        tts?: boolean;
        content?: string;
        embeds?: DiscordEmbed[];
        allowed_mentions?: string[];
        flags?: number;
        components?: DiscordComponent[];
        attachments?: DiscordAttachment[];
    };
};

export type DiscordMessagePost = {
    content?: string;
    tts?: boolean;
    embeds?: DiscordEmbed[];
    allowed_mentions?: string[];
    flags?: number;
    components?: DiscordComponent[];
    attachments?: DiscordAttachment[];
};
