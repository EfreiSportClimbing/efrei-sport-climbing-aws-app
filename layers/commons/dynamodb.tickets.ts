import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand, UpdateItemCommand, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { TicketFile } from "./dynamodb.types";

const client = new DynamoDBClient({ region: "eu-west-3" });

export async function getTickets(id: string, orderId: string | null = null): Promise<TicketFile> {
    const { Item } = await client.send(new GetItemCommand({ TableName: "Efrei-Sport-Climbing-App.tickets", Key: { id: { S: id }, orderId: { S: orderId || id } } }));
    if (!Item) {
        throw new Error("Ticket not found");
    }
    const ticket = {
        id: Item.id.S as string,
        url: Item.url.S as string,
        sold: Item.sold.BOOL as boolean,
        date: new Date(parseInt(Item.date.N as string)),
    };
    return ticket;
}

export async function putTicket(ticketInput: TicketFile): Promise<void> {
    await client.send(
        new PutItemCommand({
            TableName: "Efrei-Sport-Climbing-App.tickets",
            Item: {
                id: { S: ticketInput.id },
                orderId: { S: ticketInput.id },
                url: { S: ticketInput.url },
                sold: { BOOL: ticketInput.sold },
                date: { N: ticketInput.date.getTime().toString() },
            },
        })
    );
}

export async function listTickets(): Promise<TicketFile[]> {
    const { Items } = await client.send(new ScanCommand({ TableName: "Efrei-Sport-Climbing-App.tickets" }));
    if (!Items) {
        throw new Error("No tickets found");
    }
    const tickets = Items.map((item: any) => ({
        id: item.id.S as string,
        url: item.url.S as string,
        sold: item.sold.BOOL as boolean,
        date: new Date(parseInt(item.date.N as string)),
    }));
    return tickets as TicketFile[];
}

export async function getUnsoldTicket(): Promise<TicketFile> {
    const { Items } = await client.send(
        new ScanCommand({
            TableName: "Efrei-Sport-Climbing-App.tickets",
            FilterExpression: "sold = :false",
            ExpressionAttributeValues: {
                ":false": { BOOL: false },
            },
            Limit: 1,
        })
    );
    if (!Items) {
        throw new Error("No tickets found");
    }
    const ticket = {
        id: Items[0].id.S as string,
        url: Items[0].url.S as string,
        sold: Items[0].sold.BOOL as boolean,
        date: new Date(parseInt(Items[0].date.N as string)),
    };
    return ticket;
}

export async function getUnsoldTickets(number: number): Promise<TicketFile[]> {
    let tickets: TicketFile[] = [];
    let ExclusiveStartKey: any = undefined;

    do {
        const { Items, LastEvaluatedKey } = await client.send(
            new ScanCommand({
                TableName: "Efrei-Sport-Climbing-App.tickets",
                FilterExpression: "sold = :false",
                ExpressionAttributeValues: {
                    ":false": { BOOL: false },
                },
                ExclusiveStartKey,
            })
        );

        if (Items) {
            const newTickets = Items.map((item: any) => ({
                id: item.id.S as string,
                url: item.url.S as string,
                sold: item.sold.BOOL as boolean,
                date: new Date(parseInt(item.date.N as string)),
            }));
            tickets.push(...newTickets);
        }

        if (tickets.length >= number) {
            break;
        }

        ExclusiveStartKey = LastEvaluatedKey;
    } while (ExclusiveStartKey);

    if (tickets.length < number) {
        throw new Error("Not enough unsold tickets available");
    }

    return tickets.slice(0, number);
}

// ! invalid function, should not be used and should be removed
// ! Order is not a valid structure for tickets and are separate from tickets
export async function getOrder(orderId: string): Promise<TicketFile | null> {
    const { Items } = await client.send(
        new ScanCommand({
            TableName: "Efrei-Sport-Climbing-App.tickets",
            FilterExpression: "orderId = :orderId",
            ExpressionAttributeValues: {
                ":orderId": { S: orderId },
            },
        })
    );
    if (!Items) {
        throw new Error("No tickets found");
    }
    if (Items.length === 0) {
        return null;
    }
    if (Items.length === 1) {
        const ticket = {
            id: Items[0].id.S as string,
            orderId: Items[0].orderId.S as string,
            url: Items[0].url.S as string,
            sold: Items[0].sold.BOOL as boolean,
            date: new Date(parseInt(Items[0].date.N as string)),
        };
        return ticket;
    } else {
        throw new Error("Multiple tickets found for the same order id");
    }
}

export async function fetchOrderExists(orderId: string): Promise<boolean> {
    const { Items } = await client.send(
        new ScanCommand({
            TableName: "Efrei-Sport-Climbing-App.tickets",
            FilterExpression: "orderId = :orderId",
            ExpressionAttributeValues: {
                ":orderId": { S: orderId },
            },
        })
    );
    if (!Items) {
        throw new Error("Error fetching tickets");
    }
    return Items.length > 0;
}

export async function putOrder(orderId: string, ticketId: string): Promise<void> {
    const ticket = await getTickets(ticketId);
    if (ticket.sold) {
        throw new Error("Ticket already sold");
    }
    await client.send(
        new TransactWriteItemsCommand({
            TransactItems: [
                {
                    Put: {
                        TableName: "Efrei-Sport-Climbing-App.tickets",
                        Item: {
                            id: { S: ticketId },
                            orderId: { S: orderId },
                            date: { N: new Date().getTime().toString() },
                        },
                    },
                },
                {
                    Update: {
                        TableName: "Efrei-Sport-Climbing-App.tickets",
                        Key: {
                            id: { S: ticketId },
                            orderId: { S: ticketId },
                        },
                        UpdateExpression: "set sold = :sold",
                        ExpressionAttributeValues: {
                            ":sold": { BOOL: true },
                        },
                    },
                },
            ],
        })
    );
}
