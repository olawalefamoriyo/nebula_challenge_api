import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import leaderboardService from '../services/leaderboard';

export const submitScore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { score } = body;

    if (score === undefined) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          message: 'Missing required field: score'
        })
      };
    }

    const scoreNumber = Number(score);
    if (isNaN(scoreNumber) || scoreNumber < 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          message: 'Score must be a positive number'
        })
      };
    }

    const userData = {
      user_id: event.requestContext?.authorizer?.claims?.sub,
      user_name: event.requestContext?.authorizer?.claims?.username
    };

    const result = await leaderboardService.submitScore({
      user_id: userData.user_id,
      user_name: userData.user_name,
      score: scoreNumber
    });

    if (result.success) {
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          message: result.message,
          data: result.data
        })
      };
    } else {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          message: result.message
        })
      };
    }
  } catch (error: any) {
    console.error('Score submission handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error'
      })
    };
  }
};
