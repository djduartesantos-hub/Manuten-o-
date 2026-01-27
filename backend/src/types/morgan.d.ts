declare module 'morgan' {
  import { RequestHandler } from 'express';
  
  interface StreamOptions {
    write(text: string): void;
  }

  type FormatFn = (tokens: any, req: any, res: any) => string | undefined;

  interface Options {
    immediate?: boolean;
    skip?: (req: any, res: any) => boolean;
    stream?: StreamOptions;
  }

  function morgan(format: string | FormatFn, options?: Options): RequestHandler;
  
  namespace morgan {
    function token(name: string, fn: (req: any, res: any) => string | undefined): void;
    function format(name: string, fmt: string | FormatFn): void;
  }
  
  export = morgan;
}
