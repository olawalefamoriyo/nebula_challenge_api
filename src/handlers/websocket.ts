import { dynamoDB, apiGatewayManagementApi } from '../services/aws';

export const sendNotification = async (userId: string, message: any): Promise<boolean> => {
  try {
    const tableName = process.env.WEBSOCKET_CONNECTIONS_TABLE;
    if (!tableName) throw new Error('WEBSOCKET_CONNECTIONS_TABLE is not defined');

    const params = {
      TableName: tableName,
      // FilterExpression: 'userId <> :userId',
      // ExpressionAttributeValues: {
      //   ':userId': userId
      // }
    };

    const result = await dynamoDB.scan(params).promise();

    if (!result.Items || result.Items.length === 0) {
      console.log(`No active connections`);
      return false;
    }

    const sendPromises = result.Items.map(async (item) => {
      try {
        const postParams = {
          ConnectionId: item.connectionId,
          Data: JSON.stringify(message)
        };

        await apiGatewayManagementApi.postToConnection(postParams).promise();
        console.log(`Notification sent to connection: ${item.connectionId}`);
        return true;
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing stale connection: ${item.connectionId}`);
          await dynamoDB.delete({
            TableName: tableName,
            Key: { connectionId: item.connectionId }
          }).promise();
        } else {
          console.error(`Error sending to connection ${item.connectionId}:`, error);
        }
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(Boolean).length;

    console.log(`Successfully sent notifications to ${successCount}/${result.Items.length} connections for user: ${userId}`);
    return successCount > 0;
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return false;
  }
};

