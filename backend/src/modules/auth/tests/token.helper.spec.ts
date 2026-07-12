import { TokenHelper } from '../helpers/token.helper';
import jwt from 'jsonwebtoken';

describe('TokenHelper', () => {
  const mockPayload = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'Employee' as const,
    organizationId: 'org-456'
  };

  describe('generateTokens', () => {
    it('should generate accessToken, refreshToken and jti', () => {
      const result = TokenHelper.generateTokens(mockPayload);
      
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.jti).toBeDefined();
      
      // Verify standard JWT structure (header.payload.signature)
      expect(result.accessToken.split('.').length).toBe(3);
      expect(result.refreshToken.split('.').length).toBe(3);
    });

    it('should include correct payload in accessToken', () => {
      const { accessToken, jti } = TokenHelper.generateTokens(mockPayload);
      
      const decoded = jwt.decode(accessToken) as any;
      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.organizationId).toBe(mockPayload.organizationId);
      expect(decoded.jti).toBe(jti);
    });

    it('should include only id and jti in refreshToken', () => {
      const { refreshToken, jti } = TokenHelper.generateTokens(mockPayload);
      
      const decoded = jwt.decode(refreshToken) as any;
      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.jti).toBe(jti);
      expect(decoded.email).toBeUndefined(); // Should not include email
    });
  });

  describe('verifyAccessToken', () => {
    it('should successfully verify a valid access token', () => {
      const { accessToken } = TokenHelper.generateTokens(mockPayload);
      const decoded = TokenHelper.verifyAccessToken(accessToken);
      
      expect(decoded.id).toBe(mockPayload.id);
    });

    it('should throw JsonWebTokenError for invalid access token', () => {
      expect(() => {
        TokenHelper.verifyAccessToken('invalid.token.string');
      }).toThrow(jwt.JsonWebTokenError);
    });

    it('should throw error when verifying access token with refresh secret', () => {
      const { refreshToken } = TokenHelper.generateTokens(mockPayload);
      
      expect(() => {
        // refreshToken is signed with JWT_REFRESH_SECRET, so verifying with access secret should fail
        TokenHelper.verifyAccessToken(refreshToken);
      }).toThrow(jwt.JsonWebTokenError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should successfully verify a valid refresh token', () => {
      const { refreshToken } = TokenHelper.generateTokens(mockPayload);
      const decoded = TokenHelper.verifyRefreshToken(refreshToken);
      
      expect(decoded.id).toBe(mockPayload.id);
    });

    it('should throw error when verifying refresh token with access secret', () => {
      const { accessToken } = TokenHelper.generateTokens(mockPayload);
      
      expect(() => {
        // accessToken is signed with JWT_SECRET, so verifying with refresh secret should fail
        TokenHelper.verifyRefreshToken(accessToken);
      }).toThrow(jwt.JsonWebTokenError);
    });
  });
});
