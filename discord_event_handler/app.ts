import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sign } from 'tweetnacl';

const PUBLIC_KEY: string = process.env.PUBLIC_KEY || '';
const PING_PONG: APIGatewayProxyResult = { statusCode: 200, body: '{"type":1}' };
const UNAUTHORIZED: APIGatewayProxyResult = { statusCode: 401, body: '[UNAUTHORIZED] invalid request signature' };
const RESPONSE_TYPE = {
    PONG: 1,
    ACK_NO_SOURCE: 2,
    MESSAGE_NO_SOURCE: 3,
    MESSAGE_WITH_SOURCE: 4,
    ACK_WITH_SOURCE: 5,
};

function verify_signature(event: APIGatewayProxyEvent): void {
    const signature: string = event.headers['x-signature-ed25519'] || '';
    const timestamp: string = event.headers['x-signature-timestamp'] || '';
    const strBody: string = event.body || '';

    if (
        !sign.detached.verify(
            Buffer.from(timestamp + strBody),
            Buffer.from(signature, 'hex'),
            Buffer.from(PUBLIC_KEY, 'hex'),
        )
    ) {
        throw new Error('Invalid signature');
    }
}

function ping_pong(event: APIGatewayProxyEvent): boolean {
    const body = JSON.parse(event.body || '{}');
    if (body?.type === 1) {
        return true;
    }
    return false;
}

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // debug log
    console.log('event', event);

    console.log('PUBLIC_KEY', PUBLIC_KEY);

    try {
        verify_signature(event);
    } catch (err) {
        console.log('UNAUTHORIZED');
        return UNAUTHORIZED;
    }

    if (ping_pong(event)) {
        console.log('PING PONG');
        return PING_PONG;
    }

    // dummy response
    return {
        statusCode: 200,
        body: JSON.stringify({
            type: RESPONSE_TYPE.MESSAGE_NO_SOURCE,
            data: {
                content: 'BEEP BOOP',
            },
        }),
    };
};
