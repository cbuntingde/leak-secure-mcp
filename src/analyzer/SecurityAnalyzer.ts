/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Security Analyzer - Provides comprehensive security analysis and risk assessment
 */

import { SecretDetection } from '../detectors/SecretDetector.js';

export interface ScanResult {
  file: string;
  detections: SecretDetection[];
  severity: string;
}

export interface SecurityAnalysis {
  riskScore: number;
  complianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  remediationSteps: string[];
  recommendations: string[];
}

export class SecurityAnalyzer {
  /**
   * Calculate overall severity for a set of detections
   */
  calculateSeverity(detections: SecretDetection[]): string {
    if (detections.length === 0) {
      return 'none';
    }

    const hasCritical = detections.some((d) => d.severity === 'critical');
    const hasHigh = detections.some((d) => d.severity === 'high');
    const hasMedium = detections.some((d) => d.severity === 'medium');

    if (hasCritical) {
      return 'critical';
    }
    if (hasHigh) {
      return 'high';
    }
    if (hasMedium) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Perform comprehensive security analysis
   */
  analyze(results: ScanResult[]): SecurityAnalysis {
    const allDetections = results.flatMap((r) => r.detections);

    const criticalIssues = allDetections.filter((d) => d.severity === 'critical').length;
    const highIssues = allDetections.filter((d) => d.severity === 'high').length;
    const mediumIssues = allDetections.filter((d) => d.severity === 'medium').length;
    const lowIssues = allDetections.filter((d) => d.severity === 'low').length;

    // Calculate risk score (0-100)
    const riskScore = this.calculateRiskScore(criticalIssues, highIssues, mediumIssues, lowIssues);

    // Determine compliance status
    const complianceStatus = this.determineComplianceStatus(riskScore, criticalIssues, highIssues);

    // Generate remediation steps
    const remediationSteps = this.generateRemediationSteps(results, criticalIssues, highIssues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, riskScore);

    return {
      riskScore,
      complianceStatus,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      remediationSteps,
      recommendations,
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(
    critical: number,
    high: number,
    medium: number,
    low: number
  ): number {
    // Weighted scoring
    const criticalWeight = 10;
    const highWeight = 5;
    const mediumWeight = 2;
    const lowWeight = 1;

    const score = Math.min(
      100,
      critical * criticalWeight + high * highWeight + medium * mediumWeight + low * lowWeight
    );

    return Math.round(score);
  }

  /**
   * Determine compliance status
   */
  private determineComplianceStatus(
    riskScore: number,
    critical: number,
    high: number
  ): 'compliant' | 'at_risk' | 'non_compliant' {
    if (critical > 0 || riskScore >= 80) {
      return 'non_compliant';
    }
    if (high > 0 || riskScore >= 40) {
      return 'at_risk';
    }
    return 'compliant';
  }

  /**
   * Generate remediation steps
   */
  private generateRemediationSteps(
    results: ScanResult[],
    critical: number,
    high: number
  ): string[] {
    const steps: string[] = [];

    if (critical > 0) {
      steps.push('URGENT: Address critical security issues immediately');
      steps.push('Rotate all exposed critical secrets (API keys, passwords, tokens)');
      steps.push('Review and revoke access for compromised credentials');
    }

    if (high > 0) {
      steps.push('Address high-severity issues within 24 hours');
      steps.push('Rotate exposed secrets and update configuration');
    }

    steps.push('Remove all hardcoded secrets from codebase');
    steps.push('Implement secret management solution (e.g., AWS Secrets Manager, HashiCorp Vault)');
    steps.push('Use environment variables or secure configuration files');
    steps.push('Add pre-commit hooks to prevent committing secrets');
    steps.push('Implement automated secret scanning in CI/CD pipeline');
    steps.push('Review git history and remove secrets from commit history if needed');
    steps.push('Update documentation to use secure practices');

    return steps;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(results: ScanResult[], riskScore: number): string[] {
    const recommendations: string[] = [];

    // Group by secret type
    const secretTypes = new Map<string, number>();
    results.forEach((result) => {
      result.detections.forEach((detection) => {
        const count = secretTypes.get(detection.type) || 0;
        secretTypes.set(detection.type, count + 1);
      });
    });

    // Find most common secret types
    const topSecrets = Array.from(secretTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topSecrets.length > 0) {
      recommendations.push(
        `Most common secret types found: ${topSecrets.map(([type]) => type).join(', ')}`
      );
    }

    if (riskScore >= 70) {
      recommendations.push('Consider implementing a security review process');
      recommendations.push('Schedule immediate security audit');
    }

    recommendations.push('Enable secret scanning in your development workflow');
    recommendations.push('Train team on secure coding practices');
    recommendations.push('Implement least-privilege access controls');

    return recommendations;
  }

  /**
   * Generate summary of scan results
   */
  generateSummary(results: ScanResult[]): {
    totalFiles: number;
    filesWithSecrets: number;
    totalSecrets: number;
    severityBreakdown: Record<string, number>;
    topSecretTypes: Array<{ type: string; count: number }>;
  } {
    const allDetections = results.flatMap((r) => r.detections);

    const severityBreakdown: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const secretTypeCounts = new Map<string, number>();

    allDetections.forEach((detection) => {
      severityBreakdown[detection.severity] = (severityBreakdown[detection.severity] || 0) + 1;
      const count = secretTypeCounts.get(detection.type) || 0;
      secretTypeCounts.set(detection.type, count + 1);
    });

    const topSecretTypes = Array.from(secretTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFiles: results.length,
      filesWithSecrets: results.filter((r) => r.detections.length > 0).length,
      totalSecrets: allDetections.length,
      severityBreakdown,
      topSecretTypes,
    };
  }

  /**
   * Get recommendations for specific detections
   */
  getRecommendations(detections: SecretDetection[]): string[] {
    const recommendations = new Set<string>();

    detections.forEach((detection) => {
      recommendations.add(detection.recommendation);
    });

    // Add general recommendations
    if (detections.length > 0) {
      recommendations.add('Review all detected secrets and determine if they are still in use');
      recommendations.add('Implement secret rotation policy');
      recommendations.add('Use secret management tools instead of hardcoding');
    }

    return Array.from(recommendations);
  }
}
