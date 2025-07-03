import { DiscordButton, DiscordButtonStyle, DiscordComponentType } from "./discord.types";

export const BUTTON_VIEW_ORDER_DETAILS: (orderId: string | number) => DiscordButton = (orderId) => ({
    type: DiscordComponentType.Button,
    style: DiscordButtonStyle.Primary,
    label: "View Order Details",
    custom_id: "view_order_details=" + orderId,
});
export const FLAG_BUTTON_VIEW_ORDER_DETAILS = 0b00000001;

export const BUTTON_CANCEL_ORDER: (orderId: string | number) => DiscordButton = (orderId) => ({
    type: DiscordComponentType.Button,
    style: DiscordButtonStyle.Danger,
    label: "Cancel Order",
    custom_id: "cancel_order=" + orderId,
});
export const FLAG_BUTTON_CANCEL_ORDER = 0b00000010;

export const BUTTON_MARK_ISSUE_PROCESSED: (orderId: string | number) => DiscordButton = (orderId) => ({
    type: DiscordComponentType.Button,
    style: DiscordButtonStyle.Success,
    label: "Mark Issue as Processed",
    custom_id: "mark_issue_processed=" + orderId,
});
export const FLAG_BUTTON_MARK_ISSUE_PROCESSED = 0b00000100;

export const BUTTON_VIEW_TICKETS: (orderId: string | number) => DiscordButton = (orderId) => ({
    type: DiscordComponentType.Button,
    style: DiscordButtonStyle.Secondary,
    label: "View Tickets",
    custom_id: "view_tickets=" + orderId,
});
export const FLAG_BUTTON_VIEW_TICKETS = 0b00001000;

export const BUTTON_MARK_ORDER_PROCESSED: (orderId: string | number) => DiscordButton = (orderId) => ({
    type: DiscordComponentType.Button,
    style: DiscordButtonStyle.Success,
    label: "Mark Order as Processed",
    custom_id: "mark_order_processed=" + orderId,
});
export const FLAG_BUTTON_MARK_ORDER_PROCESSED = 0b00010000;

export const BUTTON_FETCH_TICKETS: (orderId: string | number) => DiscordButton = (orderId) => ({
    type: DiscordComponentType.Button,
    style: DiscordButtonStyle.Success,
    label: "Fetch Tickets",
    custom_id: "fetch_tickets=" + orderId,
});
export const FLAG_BUTTON_FETCH_TICKETS = 0b00100000;
