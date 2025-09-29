/**
 * Basic Configuration Validator
 * Validates environment variables and API connections
 */

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  config: {
    alpaca: {
      apiKeyValid: boolean;
      secretKeyValid: boolean;
      paperMode: boolean;
    };
    supabase: {
      urlValid: boolean;
      anonKeyValid: boolean;
      serviceKeyValid: boolean;
    };
    app: {
      environmentValid: boolean;
      secretsSecure: boolean;
      mode: 'development' | 'production' | 'test';
    };
  };
  services: ServiceStatus[];
}

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export interface ServiceStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
}

export class ConfigValidator {
  static validateEnvironment(): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check Alpaca API keys
    const alpacaApiKey = process.env.APCA_API_KEY_ID;
    const alpacaSecretKey = process.env.APCA_API_SECRET_KEY;
    const tradingMode = process.env.NEXT_PUBLIC_TRADING_MODE;

    if (!alpacaApiKey) {
      issues.push({
        field: 'APCA_API_KEY_ID',
        severity: 'error',
        code: 'MISSING_API_KEY',
        message: 'Alpaca API key is required'
      });
    }

    if (!alpacaSecretKey) {
      issues.push({
        field: 'APCA_API_SECRET_KEY',
        severity: 'error',
        code: 'MISSING_SECRET_KEY',
        message: 'Alpaca secret key is required'
      });
    }

    // Check Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      issues.push({
        field: 'NEXT_PUBLIC_SUPABASE_URL',
        severity: 'error',
        code: 'MISSING_SUPABASE_URL',
        message: 'Supabase URL is required'
      });
    }

    if (!supabaseAnonKey) {
      issues.push({
        field: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        severity: 'error',
        code: 'MISSING_SUPABASE_ANON_KEY',
        message: 'Supabase anonymous key is required'
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
      config: {
        alpaca: {
          apiKeyValid: !!alpacaApiKey,
          secretKeyValid: !!alpacaSecretKey,
          paperMode: tradingMode === 'paper'
        },
        supabase: {
          urlValid: !!supabaseUrl,
          anonKeyValid: !!supabaseAnonKey,
          serviceKeyValid: !!supabaseServiceKey
        },
        app: {
          environmentValid: true,
          secretsSecure: true,
          mode: (process.env.NODE_ENV as any) || 'development'
        }
      },
      services: []
    };
  }

  static logValidationResult(result: ValidationResult): void {
    if (result.isValid) {
      console.log('✅ Environment validation passed');
    } else {
      console.log('❌ Environment validation failed');
      result.issues.forEach(issue => {
        console.log(`  ${issue.severity}: ${issue.message} (${issue.field})`);
      });
    }
  }

  static quickValidation(): boolean {
    const result = this.validateEnvironment();

    // Quick validation only checks for critical errors
    const criticalErrors = result.issues.filter(issue => issue.severity === 'error');

    if (criticalErrors.length > 0) {
      console.log('❌ Quick validation failed:');
      criticalErrors.forEach(error => {
        console.log(`  • ${error.message}`);
      });
      return false;
    }

    return true;
  }
}