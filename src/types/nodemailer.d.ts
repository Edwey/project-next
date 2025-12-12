declare module "nodemailer" {
  interface SendMailOptions {
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
  }

  interface Transporter {
    sendMail(options: SendMailOptions): Promise<Record<string, unknown>>;
  }

  function createTransport(transport: Record<string, unknown>): Transporter;
  
  const nodemailer: {
    createTransport: typeof createTransport;
  };
  
  export default nodemailer;
}


