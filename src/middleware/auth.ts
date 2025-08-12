import authService from '../services/auth';

const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'You are not authorized to perform this action.'
    });
  }

  const token = authHeader.substring(7);
  try {
    const result = await authService.validateToken(token);
    if (result.success) {
      const userAttributes = Object.fromEntries(
        result.data.attributes.map((attr: any) => [attr.Name, attr.Value])
      );
      req.user = {
        user_id: userAttributes.sub,
        user_name: userAttributes.preferred_username,
        name: userAttributes.name,
        email: userAttributes.email
      };
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token validation failed'
    });
  }
};

export default authenticateToken;
