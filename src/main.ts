import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const logger = new Logger('OrderService');
  
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.TCP_HOST,
      port: parseInt(process.env.TCP_PORT || '3004'),
    },
  });

  app.listen().then(() => {
    logger.log('Order Service is listening on port 3004');
  });
}
bootstrap();
