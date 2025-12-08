// app/service/src/__tests__/server.test.js
const request = require('supertest');
const app = require('../server');

describe('Color Palette API Tests', () => {

  // Health check tests
  describe('GET /health', () => {
    it('should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should not be rate limited', async () => {
      // Make multiple requests to health endpoint
      const promises = Array(10).fill().map(() => request(app).get('/health'));
      const results = await Promise.all(promises);
      
      // All should succeed (not rate limited)
      results.forEach(res => {
        expect(res.statusCode).toBe(200);
      });
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const res = await request(app).get('/ready');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body).toHaveProperty('version');
    });

    it('should not be rate limited', async () => {
      const promises = Array(10).fill().map(() => request(app).get('/ready'));
      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.statusCode).toBe(200);
      });
    });
  });

  // Metrics endpoint
  describe('GET /metrics', () => {
    it('should return prometheus metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('http_request_duration_seconds');
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('color_palettes_generated_total');
    });

    it('should return correct content type', async () => {
      const res = await request(app).get('/metrics');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
    });

    it('should not be rate limited', async () => {
      const promises = Array(10).fill().map(() => request(app).get('/metrics'));
      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.statusCode).toBe(200);
      });
    });
  });

  // Main palette generation (HTML)
  describe('GET /', () => {
    it('should return HTML page', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.type).toBe('text/html');
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('Color Palette API');
    });

    it('should display version in HTML', async () => {
      const res = await request(app).get('/');
      expect(res.text).toContain('Version');
      expect(res.text).toMatch(/v\d+/);
    });

    it('should include palette colors in HTML', async () => {
      const res = await request(app).get('/');
      expect(res.text).toContain('hsl(');
      expect(res.text).toContain('color-swatch');
    });

    it('should include navigation links', async () => {
      const res = await request(app).get('/');
      expect(res.text).toContain('/api');
      expect(res.text).toContain('/metrics');
    });
  });

  // JSON API endpoint
  describe('GET /api', () => {
    it('should generate a color palette JSON', async () => {
      const res = await request(app).get('/api');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('palette');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('message');
      expect(Array.isArray(res.body.palette)).toBe(true);
      expect(res.body.palette.length).toBe(5);
    });

    it('should return valid HSL color format', async () => {
      const res = await request(app).get('/api');
      const firstColor = res.body.palette[0];
      expect(firstColor).toMatch(/^hsl\(\d+,\s*[\d.]+%,\s*[\d.]+%\)$/);
      
      // Validate all colors
      res.body.palette.forEach(color => {
        expect(color).toMatch(/^hsl\(\d+,\s*[\d.]+%,\s*[\d.]+%\)$/);
      });
    });

    it('should include theme information', async () => {
      const res = await request(app).get('/api');
      expect(res.body).toHaveProperty('theme');
      expect(['warm', 'cool']).toContain(res.body.theme);
    });

    it('should return proper JSON content type', async () => {
      const res = await request(app).get('/api');
      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('should include CORS headers', async () => {
      const res = await request(app).get('/api');
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });
  });

  // POST endpoint
  describe('POST /palette', () => {
    it('should generate palette with seed color', async () => {
      const res = await request(app)
        .post('/palette')
        .send({ seedColor: '#FF5733' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('palette');
      expect(res.body).toHaveProperty('seedColor');
      expect(res.body.seedColor).toBe('#FF5733');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should handle missing seed color', async () => {
      const res = await request(app)
        .post('/palette')
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.seedColor).toBe('random');
      expect(res.body).toHaveProperty('palette');
    });

    it('should reject SQL injection attempts', async () => {
      const res = await request(app)
        .post('/palette')
        .send({ seedColor: 'DROP TABLE users' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Invalid input');
    });

    it('should reject XSS attempts', async () => {
      const res = await request(app)
        .post('/palette')
        .send({ seedColor: '<script>alert("xss")</script>' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject SQL comment injection', async () => {
      const res = await request(app)
        .post('/palette')
        .send({ seedColor: 'test -- comment' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle valid hex colors', async () => {
      const validColors = ['#FF5733', '#00AAFF', '#123456'];
      
      for (const color of validColors) {
        const res = await request(app)
          .post('/palette')
          .send({ seedColor: color });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.seedColor).toBe(color);
      }
    });
  });

  // Version endpoint
  describe('GET /version', () => {
    it('should return version information', async () => {
      const res = await request(app).get('/version');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('node');
      expect(res.body).toHaveProperty('uptime');
    });

    it('should return valid node version format', async () => {
      const res = await request(app).get('/version');
      expect(res.body.node).toMatch(/^v\d+\.\d+\.\d+/);
    });

    it('should return numeric uptime', async () => {
      const res = await request(app).get('/version');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // Error handling
  describe('GET /error', () => {
    it('should simulate error response', async () => {
      const res = await request(app).get('/error');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('version');
      expect(res.body.error).toContain('rollback');
    });
  });

  // 404 handling
  describe('404 Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Not Found');
      expect(res.body).toHaveProperty('path');
      expect(res.body.path).toBe('/nonexistent');
    });

    it('should include version in 404 response', async () => {
      const res = await request(app).get('/invalid-route');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('version');
    });

    it('should handle POST to invalid routes', async () => {
      const res = await request(app)
        .post('/invalid')
        .send({ test: 'data' });
      
      expect(res.statusCode).toBe(404);
    });
  });

  // CORS tests
  describe('CORS', () => {
    it('should handle OPTIONS preflight request', async () => {
      const res = await request(app)
        .options('/api')
        .set('Origin', 'http://example.com');
      
      expect(res.statusCode).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });

    it('should include CORS headers in responses', async () => {
      const res = await request(app).get('/api');
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  // Rate limiting test
  describe('Rate Limiting', () => {
    it('should respect rate limits for API endpoints', async () => {
      // Make multiple rapid requests (more than the limit of 100)
      const promises = [];
      for (let i = 0; i < 105; i++) {
        promises.push(request(app).get('/api'));
      }

      const results = await Promise.all(promises);
      const rateLimited = results.some(r => r.statusCode === 429);

      expect(rateLimited).toBe(true);
    }, 30000); // Increase timeout for this test

    it('should return appropriate error message when rate limited', async () => {
      // Exhaust rate limit
      const promises = [];
      for (let i = 0; i < 105; i++) {
        promises.push(request(app).get('/api'));
      }

      const results = await Promise.all(promises);
      const rateLimitedResponse = results.find(r => r.statusCode === 429);

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toHaveProperty('error');
        expect(rateLimitedResponse.body.error).toContain('Too many requests');
      }
    }, 30000);
  });

  // Metrics increment test
  describe('Metrics Tracking', () => {
    it('should increment palette counter on generation', async () => {
      // Get initial metrics
      const before = await request(app).get('/metrics');
      const beforeText = before.text;

      // Generate palette
      await request(app).get('/api');

      // Get updated metrics
      const after = await request(app).get('/metrics');
      const afterText = after.text;

      // Verify counter was incremented
      expect(afterText).toContain('color_palettes_generated_total');
      expect(beforeText.length).toBeLessThan(afterText.length);
    });

    it('should track HTTP request metrics', async () => {
      await request(app).get('/api');
      
      const res = await request(app).get('/metrics');
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('http_request_duration_seconds');
    });
  });
});

// Integration tests
describe('Integration Tests', () => {
  it('should handle full request lifecycle', async () => {
    // Generate palette via HTML endpoint
    const res1 = await request(app).get('/');
    expect(res1.statusCode).toBe(200);

    // Generate palette via JSON API
    const res2 = await request(app).get('/api');
    expect(res2.statusCode).toBe(200);

    // Check metrics were updated
    const res3 = await request(app).get('/metrics');
    expect(res3.text).toContain('color_palettes_generated_total');

    // Verify health
    const res4 = await request(app).get('/health');
    expect(res4.statusCode).toBe(200);
  });

  it('should maintain consistency across endpoints', async () => {
    // Get version from multiple sources
    const apiRes = await request(app).get('/api');
    const versionRes = await request(app).get('/version');
    const healthRes = await request(app).get('/health');

    // All should report same version
    expect(apiRes.body.version).toBe(versionRes.body.version);
    expect(apiRes.body.version).toBe(healthRes.body.version);
  });

  it('should handle concurrent requests', async () => {
    const promises = [
      request(app).get('/'),
      request(app).get('/api'),
      request(app).get('/health'),
      request(app).get('/metrics'),
      request(app).post('/palette').send({ seedColor: '#FF0000' })
    ];

    const results = await Promise.all(promises);

    // All requests should succeed
    results.forEach((res, idx) => {
      if (idx < 4) {
        expect(res.statusCode).toBe(200);
      } else {
        expect([200, 400]).toContain(res.statusCode);
      }
    });
  });

  it('should properly log requests', async () => {
    // This test verifies middleware is properly set up
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await request(app).get('/api');
    
    // Verify logging occurred
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// Security tests
describe('Security Tests', () => {
  it('should validate input types', async () => {
    const res = await request(app)
      .post('/palette')
      .send({ seedColor: 12345 }); // Send number instead of string

    expect([200, 400]).toContain(res.statusCode);
  });

  it('should handle malformed JSON', async () => {
    const res = await request(app)
      .post('/palette')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}');

    expect(res.statusCode).toBe(400);
  });

  it('should not expose sensitive error details in production', async () => {
    // Simulate error
    const res = await request(app).get('/error');
    
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('error');
    
    // In production mode, should not expose stack traces
    if (process.env.NODE_ENV === 'production') {
      expect(res.body).not.toHaveProperty('stack');
    }
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('should respond to health checks quickly', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should respond in under 100ms
  });

  it('should generate palettes efficiently', async () => {
    const start = Date.now();
    await request(app).get('/api');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500); // Should respond in under 500ms
  });
});