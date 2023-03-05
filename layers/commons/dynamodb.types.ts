export type User = {
    id: string;
    firstName: string;
    lastName: string;
    promo: string;
    nbOfSeances: number;
};

export type Session = {
    id: string;
    date: Date;
    location: string;
};
