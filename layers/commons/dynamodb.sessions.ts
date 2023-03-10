import {
    BatchGetItemCommand,
    BatchWriteItemCommand,
    DeleteItemCommand,
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
        new GetItemCommand({ TableName: 'Efrei-Sport-Climbing-App.sessions', Key: { id: { S: id }, sortId: { S: id } } }),
    );
    if (!Item) {
        throw new Error('Session not found');
    }
    const session = {
        id: Item.id.S as string,
        date: new Date(parseInt(Item.date.N as string)),
        location: Item.location.S as string,
    };
    return session;
}

export async function findSession(date: Date, location: string): Promise<Session> {
    const params = {
        ExpressionAttributeValues: {
            ':date': { N: date.getTime().toString() },
            ':location': { S: location },
            ':isExpired': { BOOL: false },
        },
        ExpressionAttributeNames: {
            '#id': 'id',
            '#date': 'date',
            '#location': 'location',
            '#isExpired': 'isExpired',
        },
        FilterExpression: '#date = :date AND #location = :location AND #isExpired = :isExpired',
        ProjectionExpression: '#id, #date, #location',
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
        location: Item?.location.S as string,
    };
    return session;
}

export async function putSession(sessionInput: Session, participants: string[]): Promise<void> {
    const expirationDate = new Date(sessionInput.date.getTime() + 24 * 60 * 60 * 1000);
    expirationDate.setHours(0, 0, 0, 0);
    const sessionItem = {
        id: { S: sessionInput.id },
        sortId: { S: sessionInput.id },
        date: { N: sessionInput.date.getTime().toString() },
        location: { S: sessionInput.location },
        expiresAt: { N: sessionInput.date.getTime().toString() },
        isExpired: { BOOL: false },
    };
    const userItems = participants.map((participant) => {
        return {
            id: { S: sessionInput.id },
            sortId: { S: participant },
        }
    });
    await client.send(new BatchWriteItemCommand(
        {
            RequestItems: {
                "Efrei-Sport-Climbing-App.sessions": [
                    {
                        PutRequest: {
                            Item: sessionItem
                        }
                    },
                    ...userItems.map((item) => {
                        return {
                            PutRequest: {
                                Item: item
                            }
                        }
                    })
                ],
            }
        },
    ))
}

export async function deleteSession(id: string): Promise<void> {
    const params = {
        ExpressionAttributeValues: {
            ':id': { S: id },
        },
        ExpressionAttributeNames: {
            '#id': 'id',
            '#sortId': 'sortId',
        },
        FilterExpression: '#id = :id',
        ProjectionExpression: '#id, #sortId',
        TableName: 'Efrei-Sport-Climbing-App.sessions',
    };
    const { Items, Count } = await client.send(new ScanCommand(params));
    if (Count === 0) {
        throw new Error('Session not found');
    }
    await client.send(
        new BatchWriteItemCommand({
            RequestItems: {
                'Efrei-Sport-Climbing-App.sessions': Items?.map((item) => {
                    return {
                        DeleteRequest: {
                            Key: {
                                id: item.id,
                                sortId: item.sortId,
                            },
                        },
                    }
                }) || [],
            }
        }
        )
    );
}

export async function expireSession(id: string): Promise<void> {
    await client.send(
        new UpdateItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.sessions',
            Key: { id: { S: id }, sortId: { S: id } },
            AttributeUpdates: {
                isExpired: {
                    Action: 'PUT',
                    Value: { BOOL: true },
                },
            },
        }),
    );
}

export async function addUserToSession(id: string, idUser: string): Promise<void> {
    const { Item } = await client.send(
        new GetItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.sessions',
            Key: { id: { S: id }, sortId: { S: idUser } },
        }),
    );
    if (Item) {
        throw new Error('UserAlreadyRegisteredError');
    }
    await client.send(
        new PutItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.sessions',
            Item: {
                id: { S: id },
                sortId: { S: idUser },
            },
        }),
    );
}

export async function removeUserFromSession(id: string, idUser: string): Promise<void> {
    const { Item } = await client.send(
        new GetItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.sessions',
            Key: { id: { S: id }, sortId: { S: idUser } },
        }),
    );
    if (!Item) {
        throw new Error('UserNotRegisteredError');
    }
    await client.send(
        new DeleteItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.sessions',
            Key: {
                id: { S: id },
                sortId: { S: idUser },
            },
        }),
    );
}

export async function listSessionsExpired(): Promise<Session[]> {
    const params = {
        ExpressionAttributeValues: {
            ':now': { N: new Date().getTime().toString() },
            ':isExpired': { BOOL: false },
        },
        ExpressionAttributeNames: {
            '#id': 'id',
            '#date': 'date',
            '#location': 'location',
            '#isExpired': 'isExpired',
            '#expiresAt': 'expiresAt',
        },
        FilterExpression: '#expiresAt < :now AND #isExpired = :isExpired',
        ProjectionExpression: '#id, #date, #location',
        TableName: 'Efrei-Sport-Climbing-App.sessions',
    };
    const { Items } = await client.send(new ScanCommand(params));
    const sessions = Items?.map((Item) => ({
        id: Item?.id.S as string,
        date: new Date(Item?.date.S as string),
        location: Item?.location.S as string,
    }));
    return sessions || [];
}

export async function countSessionsWithUser(idUser: string, from: Date | null = null, to: Date | null = null): Promise<number> {
    const params = {
        ExpressionAttributeValues: {
            ':idUser': { S: idUser },
        },
        ExpressionAttributeNames: {
            '#id': 'id',
            '#sortId': 'sortId',
        },
        FilterExpression: '#sortId = :idUser',
        ProjectionExpression: '#id, #sortId',
        TableName: 'Efrei-Sport-Climbing-App.sessions',
    };
    const { Items, Count } = await client.send(new ScanCommand(params));
    if (from && to && Count) {
        const sessionsItems = Items?.map((Item) => ({
            id: { S: Item?.id.S as string },
            sortId: { S: Item?.id.S as string },
        }));
        const data = await client.send(new BatchGetItemCommand({
            RequestItems: {
                "Efrei-Sport-Climbing-App.sessions": {
                    Keys: sessionsItems,
                    ProjectionExpression: '#id, #date',
                    ExpressionAttributeNames: {
                        '#id': 'id',
                        '#date': 'date',
                    },
                }
            }
        }));
        const sessions = data.Responses?.["Efrei-Sport-Climbing-App.sessions"]?.filter((session: any) => from.getTime() <= parseInt(session.date.N) && parseInt(session.date.N) <= to.getTime());
        return sessions?.length || 0;
    }
    return Count || 0;
}

export async function countParticipants(id: string): Promise<Number> {
    const params = {
        ExpressionAttributeValues: {
            ':id': { S: id },
        },
        ExpressionAttributeNames: {
            '#id': 'id',
            '#sortId': 'sortId',
        },
        FilterExpression: '#id = :id AND #sortId <> :id',
        ProjectionExpression: '#id, #sortId',
        TableName: 'Efrei-Sport-Climbing-App.sessions',
    };
    const { Count } = await client.send(new ScanCommand(params));
    return Count || 0;
}