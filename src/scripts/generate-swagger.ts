import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../app.module';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Healthy Food E-Commerce API')
    .setDescription('Healthy Food E-Commerce API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const yamlContent = yaml.dump(document, { lineWidth: -1 });
  const outputPath = path.resolve(process.cwd(), 'swagger.yaml');
  fs.writeFileSync(outputPath, yamlContent, 'utf8');

  console.log(`Swagger YAML written to ${outputPath}`);
  await app.close();
}

void generate();
