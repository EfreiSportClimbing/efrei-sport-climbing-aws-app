import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { TicketFile } from "./dynamodb.types";

const client = new DynamoDBClient({ region: "eu-west-3" });

export async function getTickets(id: string): Promise<TicketFile> {
    const { Item } = await client.send(new GetItemCommand({ TableName: "Efrei-Sport-Climbing-App.tickets", Key: { id: { S: id } } }));
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
