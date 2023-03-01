import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { User } from './dynamodb.types';

const client = new DynamoDBClient({ region: 'eu-west-3' });

export async function getUser(id: string): Promise<User> {
    const { Item } = await client.send(
        new GetItemCommand({ TableName: 'Efrei-Sport-Climbing-App.users', Key: { id: { S: id } } }),
    );
    if (!Item) {
        throw new Error('User not found');
    }
    const user = {
        id: Item.id.S as string,
        firstName: Item.firstName.S as string,
        lastName: Item.lastName.S as string,
        promo: Item.promo.S as string,
        nbOfSeances: parseInt(Item.nbOfSeances.N as string),
    };
    return user;
}

export async function putUser(userInput: User): Promise<void> {
    await client.send(
        new PutItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.users',
            Item: {
                id: { S: userInput.id },
                firstName: { S: userInput.firstName },
                lastName: { S: userInput.lastName },
                promo: { S: userInput.promo },
                nbOfSeances: { N: userInput.nbOfSeances.toString() },
            },
        }),
    );
}

export async function incrementUser(id: string, value: number): Promise<void> {
    await client.send(
        new UpdateItemCommand({
            TableName: 'Efrei-Sport-Climbing-App.users',
            Key: { id: { S: id } },
            AttributeUpdates: {
                nbOfSeance: {
                    Action: 'ADD',
                    Value: { N: value.toString() },
                },
            },
        }),
    );
}
