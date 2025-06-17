import { EventEmitter } from 'events';
import cron from 'node-cron';

export class HealthMonitor extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.isMonitoring = false;
    this.metrics = {
      uptime: 0,
      errors: 0,
      restarts: 0,
      avgBitrate: 0,
      avgFps: 0,
      lastHealthCheck: null
    };
    this.alerts = [];
    this.cronJob = null;
  }

  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Health monitoring started');

    // Run health checks every 30 seconds
    this.cronJob = cron.schedule('*/30 * * * * *', () => {
      this.performHealthCheck();
    });

    // Generate analytics every minute
    cron.schedule('0 * * * * *', () => {
      this.generateAnalytics();
    });
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
    
    this.isMonitoring = false;
    this.logger.info('Health monitoring stopped');
  }

  performHealthCheck() {
    const timestamp = new Date();
    this.metrics.lastHealthCheck = timestamp;

    // Simulate health metrics (in real implementation, these would come from actual stream monitoring)
    const healthScore = this.calculateHealthScore();
    
    let health;
    if (healthScore >= 90) health = 'excellent';
    else if (healthScore >= 75) health = 'good';
    else if (healthScore >= 50) health = 'fair';
    else health = 'poor';

    const status = {
      health,
      timestamp,
      healthScore,
      metrics: { ...this.metrics }
    };

    this.emit('statusUpdate', status);

    // Check for alerts
    this.checkAlerts(status);
  }

  calculateHealthScore() {
    // Simulate health score calculation based on various factors
    let score = 100;

    // Reduce score based on errors
    score -= this.metrics.errors * 5;

    // Reduce score based on restarts
    score -= this.metrics.restarts * 10;

    // Add some randomness to simulate real conditions
    score += Math.random() * 10 - 5;

    return Math.max(0, Math.min(100, score));
  }

  checkAlerts(status) {
    const { healthScore } = status;

    // Low health alert
    if (healthScore < 50) {
      this.createAlert('warning', 'Stream health is poor', {
        healthScore,
        timestamp: new Date()
      });
    }

    // High error rate alert
    if (this.metrics.errors > 10) {
      this.createAlert('error', 'High error rate detected', {
        errors: this.metrics.errors,
        timestamp: new Date()
      });
    }
  }

  createAlert(type, message, data) {
    const alert = {
      id: Date.now(),
      type,
      message,
      data,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.emit('alert', alert);
    this.logger.warn(`Alert: ${message}`, data);
  }

  generateAnalytics() {
    const analytics = {
      timestamp: new Date(),
      uptime: this.metrics.uptime,
      errors: this.metrics.errors,
      restarts: this.metrics.restarts,
      avgBitrate: this.metrics.avgBitrate,
      avgFps: this.metrics.avgFps,
      healthScore: this.calculateHealthScore(),
      // Simulate viewer count
      viewers: Math.floor(Math.random() * 500) + 100,
      // Simulate bandwidth usage
      bandwidth: Math.floor(Math.random() * 1000) + 2000
    };

    this.emit('analytics', analytics);
  }

  updateMetrics(metrics) {
    this.metrics = { ...this.metrics, ...metrics };
  }

  getAnalytics() {
    return {
      metrics: this.metrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      lastHealthCheck: this.metrics.lastHealthCheck
    };
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.info(`Alert acknowledged: ${alert.message}`);
    }
  }
}