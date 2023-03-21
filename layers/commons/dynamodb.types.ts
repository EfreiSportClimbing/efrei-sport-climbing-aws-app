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
    url: string;
    sold: boolean;
    date: Date;
}

export type Order = {
    id: string;
    date: Date;
    user: User;
    tickets: TicketFile[];
    nbOfTickets: number;
    delivered: Date;
    refunded: Date;
    failed: Date;
}