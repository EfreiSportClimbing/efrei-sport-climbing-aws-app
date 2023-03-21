import { APIGatewayProxyResult } from 'aws-lambda';
import { putTicket } from 'commons/dynamodb.tickets';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const lambdaHandler = async (event: any, context: any): Promise<APIGatewayProxyResult> => {
    const { Records } = event;
    if (!Records) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'no records',
            }),
        };
    }
    for (const record of Records) {
        console.log('record', JSON.stringify(record));
        const { s3 } = record;
        if (!s3) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'no s3',
                }),
            };
        }
        const { object } = s3;
        if (!object) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'no object',
                }),
            };
        }
        await putTicket({
            id: context.awsRequestId,
            url: object.key,
            sold: false,
            date: new Date(),
        });
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'file added to db',
        }),
    };
};
