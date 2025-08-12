import dotenv from 'dotenv';
dotenv.config();

import AWS from 'aws-sdk';

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION
});

export const cognitoISP = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION
});

export const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
  region: process.env.AWS_REGION,
  endpoint: process.env.WEBSOCKET_CONNECTION_URL
});

export default AWS; 