import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { Issue, IssueStatus } from "./dynamodb.types";

const client = new DynamoDBClient({ region: "eu-west-3" });

export async function getIssue(orderId: string): Promise<Issue> {
    const { Item } = await client.send(
        new GetItemCommand({
            TableName: "Efrei-Sport-Climbing-App.issues",
            Key: { orderId: { S: orderId } },
        })
    );
    if (!Item) {
        throw new Error("Issue not found");
    }
    return {
        id: Item.orderId.S as string,
        description: Item.description.S as string,
        status: Item.status.S as IssueStatus,
        createdAt: new Date(parseInt(Item.createdAt.N as string)),
        updatedAt: Item.updatedAt ? new Date(parseInt(Item.updatedAt.N as string)) : null,
        order: Item.order ? JSON.parse(Item.order.S as string) : null,
        flags: Item.flags ? parseInt(Item.flags.N as string) : undefined, // Assuming flags is a number
    };
}

export async function listIssues(
    open_only: boolean = false,
    limit: number | null = null,
    lastEvaluatedKey: Record<string, any> | undefined = undefined
): Promise<[Issue[], Record<string, any> | undefined]> {
    const collected: Issue[] = [];
    let ExclusiveStartKey = lastEvaluatedKey && lastEvaluatedKey.orderId ? { orderId: lastEvaluatedKey.orderId } : undefined;

    let finalKey: Record<string, any> | undefined = undefined;

    while (true) {
        const scanParams: any = {
            TableName: "Efrei-Sport-Climbing-App.issues",
            ProjectionExpression: "orderId, description, #status, createdAt, updatedAt",
            ExpressionAttributeNames: {
                "#status": "status",
            },
            FilterExpression: open_only ? "#status = :open" : undefined,
            ExpressionAttributeValues: open_only ? { ":open": { S: IssueStatus.OPEN } } : undefined,
            ExclusiveStartKey,
            ConsistentRead: true,
            Limit: 25, // Internal scan page size
        };

        const { Items, LastEvaluatedKey } = await client.send(new ScanCommand(scanParams));

        if (Items && Items.length > 0) {
            const issues: Issue[] = Items.map((item) => ({
                id: item.orderId.S as string,
                description: item.description.S as string,
                status: item.status.S as IssueStatus,
                createdAt: new Date(parseInt(item.createdAt.N as string)),
                updatedAt: item.updatedAt ? new Date(parseInt(item.updatedAt.N as string)) : null,
                order: null,
            }));

            for (const issue of issues) {
                if (limit && collected.length >= limit) {
                    return [collected, finalKey];
                }
                collected.push(issue);
                finalKey = { orderId: { S: issue.id } };
            }
        }

        if (!LastEvaluatedKey) {
            // No more data
            break;
        }

        ExclusiveStartKey = LastEvaluatedKey as { orderId: { S: string } | undefined };
    }

    return [collected, undefined];
}

export async function putIssue(issue: Issue): Promise<void> {
    await client.send(
        new PutItemCommand({
            TableName: "Efrei-Sport-Climbing-App.issues",
            Item: {
                orderId: { S: issue.id },
                description: { S: issue.description },
                status: { S: issue.status },
                createdAt: { N: issue.createdAt.getTime().toString() },
                updatedAt: issue.updatedAt ? { N: issue.updatedAt.getTime().toString() } : { NULL: true },
                order: issue.order ? { S: JSON.stringify(issue.order) } : { NULL: true },
                flags: issue.flags ? { N: issue.flags.toString() } : { NULL: true },
            },
        })
    );
}

export async function updateIssue(orderId: string, updates: Partial<Issue>): Promise<void> {
    const updateExpression = [];
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.description) {
        updateExpression.push("description = :description");
        expressionAttributeValues[":description"] = { S: updates.description };
    }
    if (updates.status) {
        updateExpression.push("#status = :status");
        expressionAttributeValues[":status"] = { S: updates.status };
    }
    if (updates.updatedAt) {
        updateExpression.push("updatedAt = :updatedAt");
        expressionAttributeValues[":updatedAt"] = { N: updates.updatedAt.getTime().toString() };
    }
    if (updates.order) {
        updateExpression.push("order = :order");
        expressionAttributeValues[":order"] = { S: JSON.stringify(updates.order) };
    }

    if (updateExpression.length === 0) {
        throw new Error("No updates provided");
    }

    await client.send(
        new UpdateItemCommand({
            TableName: "Efrei-Sport-Climbing-App.issues",
            Key: { orderId: { S: orderId } },
            UpdateExpression: `SET ${updateExpression.join(", ")}`,
            ExpressionAttributeNames: {
                "#status": "status",
            },
            ExpressionAttributeValues: expressionAttributeValues,
        })
    );
}

export async function resolveIssue(orderId: string): Promise<void> {
    await client.send(
        new UpdateItemCommand({
            TableName: "Efrei-Sport-Climbing-App.issues",
            Key: { orderId: { S: orderId } },
            UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
            ExpressionAttributeNames: {
                "#status": "status",
            },
            ExpressionAttributeValues: {
                ":status": { S: IssueStatus.CLOSED },
                ":updatedAt": { N: new Date().getTime().toString() },
            },
        })
    );
}

export async function fetchIssueExists(orderId: string): Promise<boolean> {
    const { Item } = await client.send(
        new GetItemCommand({
            TableName: "Efrei-Sport-Climbing-App.issues",
            Key: { orderId: { S: orderId } },
            ProjectionExpression: "orderId",
        })
    );
    return !!Item;
}
