import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDB } from '../services/aws';

export const connectHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const connectionId = event.requestContext.connectionId;
    const tableName = process.env.WEBSOCKET_CONNECTIONS_TABLE;
    if (!tableName) throw new Error('WEBSOCKET_CONNECTIONS_TABLE is not defined');

    await dynamoDB.put({
      TableName: tableName,
      Item: { connectionId },
    }).promise();

    return {
      statusCode: 200,
      body: 'Connected.'
    };
  } catch (error: any) {
    console.error('WebSocket $connect error:', error);
    return {
      statusCode: 500,
      body: 'Failed to connect.'
    };
  }
};

export default connectHandler;
