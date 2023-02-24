import {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    ScanCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { Session } from './dynamodb.types';

const client = new DynamoDBClient({ region: 'eu-west-3' });

export async function getSession(id: string): Promise<Session> {
    const { Item } = await client.send(
        new GetItemCommand({ TableName: 'Efrei-Sport-Climbing-App.sessions', Key: { id: { S: id } } }),
    );
    if (!Item) {
        throw new Error('Session not found');
    }
    const session = {
        id: Item.id.S as string,
        date: new Date(parseInt(Item.date.N as string)),
        participants: Item.participants.SS as string[],
        location: Item.location.S as string,
    };
    return session;
}

export async function findSession(date: Date, location: string): Promise<Session> {
    const params = {
        ExpressionAttributeValues: {
            ':date': { N: date.getTime().toString() },
            ':location': { S: location },
        },
        ExpressionAttributeNames: {
            '#id': 'id',
            '#date': 'date',
            '#location': 'location',
        },
        FilterExpression: '#date = :date AND #location = :location',
        ProjectionExpression: '#id, #date, participants, #location',
        TableName: 'Efrei-Sport-Climbing-App.sessions',
        Limit: 1,
    };
    const { Items, Count } = await client.send(new ScanCommand(params));
    if (Count === 0) {
        throw new Error('Session not found');
    }
    const Item = Items?.[0];
    const session = {
        id: Item?.id.S as string,
        date: new Date(Item?.date.S as string),
        participants: Item?.participants.SS as string[],
        location: Item?.location.S as string,
    };
    return session;
}

export async function putSession(userInput: Session): Promise<void> {
    await client.send(
        new PutItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.sessions',
            Item: {
                id: { S: userInput.id },
                date: { N: userInput.date.getTime().toString() },
                participants: { SS: userInput.participants },
                location: { S: userInput.location },
                expiresAt: { N: (userInput.date.setHours(0) + 24 * 60 * 60 * 1000).toString() },
            },
        }),
    );
}

export async function addUserToSession(id: string, idUser: string): Promise<void> {
    await client.send(
        new UpdateItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.sessions',
            Key: { id: { S: id } },
            AttributeUpdates: {
                participants: {
                    Action: 'ADD',
                    Value: { SS: [idUser] },
                },
            },
        }),
    );
}

export async function removeUserFromSession(id: string, idUser: string): Promise<void> {
    await client.send(
        new UpdateItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.sessions',
            Key: { id: { S: id } },
            AttributeUpdates: {
                participants: {
                    Action: 'DELETE',
                    Value: { SS: [idUser] },
                },
            },
        }),
    );
}
