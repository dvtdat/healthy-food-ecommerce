import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as ngrok from '@ngrok/ngrok';

const DEFAULT_PORT = 3300;

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const config = new DocumentBuilder()
    .setTitle('Healthy Food E-Commerce API')
    .setDescription('Healthy Food E-Commerce API description')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, documentFactory);

  const port = process.env.PORT ?? DEFAULT_PORT;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);

  if (process.env.NODE_ENV !== 'production' && process.env.NGROK_AUTHTOKEN) {
    const listener = await ngrok.connect({
      addr: port,
      authtoken: process.env.NGROK_AUTHTOKEN,
    });
    const url = listener.url();
    logger.log(`Ngrok tunnel: ${url}`);
    logger.log(`Casso webhook URL: ${url}/webhooks/casso`);
  }
}
void bootstrap();
