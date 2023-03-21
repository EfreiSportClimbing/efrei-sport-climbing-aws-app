import { APIGatewayProxyResult } from 'aws-lambda';
import { listSessionUnexpired } from 'commons/dynamodb.sessions';
import ical from 'ical-generator';
import { Session } from 'commons/dynamodb.types';
import { updateFile } from './src/s3.images';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
    // debug log
    console.log('event');
    const sessions = await listSessionUnexpired();
    const calendar = ical({
        name: 'Efrei Sport Climbing App',
        source: 'https://efrei-sport-climbing-app.com/ressources/calendar.ical',
    });
    sessions.forEach((session: Session) => {
        const endDate = new Date(session.date.getTime() + 2 * 60 * 60 * 1000);
        console.log(endDate, session.date);
        const event = calendar.createEvent({
            start: session.date,
            end: endDate,
            summary: `Séance d'escalade à ${session.location}.`,
            description: `Séance d'escalade à ${session.location}.`,
            location: session.location,
        });
        // add participants
        session.participants?.forEach((participant) => {
            event.createAttendee({
                name: `${participant.firstName} ${participant.lastName}`,
                email: 'noreply@esc.fr',
            });
        });
    });
    console.log(calendar.toString());

    const file = calendar.toString();

    await updateFile('ressources/calendar.ics', file);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'file updated',
        }),
    };
};
