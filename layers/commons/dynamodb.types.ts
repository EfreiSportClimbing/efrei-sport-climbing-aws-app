import { Order } from "./helloasso.types";

export type User = {
    id: string;
    firstName: string;
    lastName: string;
    promo: string;
    nbOfSeances?: number;
};

export type Session = {
    id: string;
    date: Date;
    location: string;
    participants?: User[];
};

export type TicketFile = {
    id: string;
    orderId?: string;
    url: string;
    sold: boolean;
    date: Date;
};

export type OrderRecord = {
    ticketId: string;
    orderId: string;
    date: Date;
    state: OrderState;
};

export enum OrderState {
    PENDING = "pending",
    PROCESSED = "processed",
    CANCELED = "cancelled",
}

export type Issue = {
    id: string;
    description: string;
    status: IssueStatus;
    createdAt: Date;
    updatedAt: Date | null;
    order: Order | null;
    flags?: number; // Bitmask for flags
};

export enum IssueStatus {
    OPEN = "open",
    CLOSED = "closed",
}
