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

export async function putOrder(orderId: string, ticketId: string): Promise<void> {
    const ticket = await getTickets(ticketId);
    if (ticket.sold) {
        throw new Error("Ticket already sold");
    }
    await client.send(
        new PutItemCommand({
            TableName: "Efrei-Sport-Climbing-App.tickets",
            Item: {
                id: { S: ticketId },
                orderId: { S: orderId },
                url: { S: ticket.url },
                sold: { BOOL: true },
                date: { N: ticket.date.getTime().toString() },
            },
        })
    );
}
