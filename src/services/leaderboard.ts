import { v4 as uuidv4 } from 'uuid';
import { dynamoDB } from './aws';
import { sendNotification } from '../handlers/websocket';

export interface ScoreData {
  user_id: string;
  user_name: string;
  score: number;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  user_name: string;
  score: number;
  timestamp: number;
}

export interface LeaderboardResponse {
  success: boolean;
  message: string;
  data?: LeaderboardEntry[];
}

export class LeaderboardService {
  private static instance: LeaderboardService;

  private constructor() {}

  public static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  private getLeaderboardTable(): string {
    const table = process.env.LEADERBOARD_TABLE;
    if (!table) throw new Error('LEADERBOARD_TABLE is not defined in environment variables');
    return table;
  }

  async submitScore(scoreData: ScoreData): Promise<LeaderboardResponse> {
    try {
      const timestamp = Date.now();
      const id = uuidv4();

      const item: LeaderboardEntry = {
        id,
        user_id: scoreData.user_id,
        user_name: scoreData.user_name,
        score: scoreData.score,
        timestamp
      };

      const params = {
        TableName: this.getLeaderboardTable(),
        Item: item
      };

      await dynamoDB.put(params).promise();

      if (scoreData.score > 1000) {
        try {
          const notificationMessage = {
            type: 'highScore',
            data: {
              userId: scoreData.user_id,
              userName: scoreData.user_name,
              score: scoreData.score,
              message: `🎉 Congratulations! You've achieved a high score of ${scoreData.score}!`,
              timestamp: Date.now()
            }
          };

          await sendNotification(scoreData.user_id, notificationMessage);
          console.log(`High score notification sent to user: ${scoreData.user_id}`);
        } catch (notificationError) {
          console.error('Failed to send high score notification:', notificationError);
        }
      }

      return {
        success: true,
        message: 'Score submitted successfully',
        data: [item]
      };
    } catch (error: any) {
      console.error('Score submission error:', error);
      return {
        success: false,
        message: error.message || 'Failed to submit score'
      };
    }
  }

  async getLeaderboard(): Promise<LeaderboardResponse> {
    try {
      const params = {
        TableName: this.getLeaderboardTable()
      };

      const result = await dynamoDB.scan(params).promise();

      if (!result.Items || result.Items.length === 0) {
        return {
          success: true,
          message: 'No scores found',
          data: []
        };
      }

      const topScore = result.Items.sort((a, b) => b.score - a.score)[0];

      return {
        success: true,
        message: 'Leaderboard retrieved successfully',
        data: topScore ? [topScore as LeaderboardEntry] : []
      };
    } catch (error: any) {
      console.error('Leaderboard retrieval error:', error);
      return {
        success: false,
        message: error.message || 'Failed to retrieve leaderboard'
      };
    }
  }

  async deleteAllScores(): Promise<LeaderboardResponse> {
    try {
      const table = this.getLeaderboardTable();
      const scanResult = await dynamoDB.scan({ TableName: table }).promise();

      if (!scanResult.Items || scanResult.Items.length === 0) {
        return {
          success: true,
          message: 'No scores to delete',
          data: []
        };
      }

      const deletePromises = scanResult.Items.map((item: any) => {
        return dynamoDB.delete({
          TableName: table,
          Key: {
            id: item.id
          }
        }).promise();
      });

      await Promise.all(deletePromises);

      return {
        success: true,
        message: `Successfully deleted ${scanResult.Items.length} scores`,
        data: []
      };
    } catch (error: any) {
      console.error('Delete all scores error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete scores'
      };
    }
  }
}

export default LeaderboardService.getInstance();
