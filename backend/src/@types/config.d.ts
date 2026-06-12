declare global {
  interface AppConfig {
    env: string;
    app: {
      port: number;
      host: string;
      name: string;
      validateSecurity: boolean;
      trustProxy: boolean;
      bodyParserJsonLimit: string;
      jwtAccessSecret: string;
      jwtRefreshSecret: string;
      cors: {
        origin: string;
        credentials: boolean;
      };
    };
    database: {
      url: string;
    };
    s3: {
      bucket: string;
      connection: {
        endpoint: string;
        region: string;
        credentials: {
          accessKeyId: string;
          secretAccessKey: string;
        };
        forcePathStyle: boolean;
      };
    };
  }
}

export {};
