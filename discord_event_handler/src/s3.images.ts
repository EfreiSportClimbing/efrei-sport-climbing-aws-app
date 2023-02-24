import { GetObjectCommand, GetObjectOutput, S3Client } from '@aws-sdk/client-s3';
import { IncomingMessage } from 'http';
import { Response } from 'node-fetch';

const client = new S3Client({ region: 'eu-west-3' });

export async function getImage(path: string): Promise<Blob> {
    // list files
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
