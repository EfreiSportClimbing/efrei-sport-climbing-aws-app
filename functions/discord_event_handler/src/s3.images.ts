import { GetObjectCommand, GetObjectOutput, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { IncomingMessage } from 'http';
import { Response } from 'node-fetch';

const client = new S3Client({ region: 'eu-west-3' });

export async function getFile(path: string): Promise<Blob> {
    // get file from s3
    const data = (await client.send(
        new GetObjectCommand({ Bucket: 'efrei-sport-climbing-app-data', Key: path }),
    )) as GetObjectOutput;
    if (!data.Body) {
        throw new Error('Image not found');
    }
    // get the file from the Body
    const res = new Response(data.Body as IncomingMessage);
    return await res.blob();
}

export async function updateFile(path: string, file: Blob): Promise<void> {
    await client.send(
        new PutObjectCommand({
            Bucket: 'efrei-sport-climbing-app-data',
            Key: path,
            Body: file,
        }),
    );
}
