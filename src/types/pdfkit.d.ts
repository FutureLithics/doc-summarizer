declare module 'pdfkit' {
  import { EventEmitter } from 'events';
  
  class PDFDocument extends EventEmitter {
    constructor(options?: any);
    pipe(dest: any): this;
    end(): this;
    text(text: string, x?: number, y?: number, options?: any): this;
  }
  export = PDFDocument;
} 