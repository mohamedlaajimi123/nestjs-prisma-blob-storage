import { Injectable, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Express  } from 'express';
import 'multer';

@Injectable()
export class StorageService implements OnModuleInit {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  onModuleInit() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads';

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is missing from .env');
    }

    // Initialize Azure SDK
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
  }

  async saveFile(file: Express.Multer.File): Promise<{ filePath: string; fileName: string; mimeType: string; size: number }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Generate unique name to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeFileName = `${uniqueSuffix}-${file.originalname.replace(/\s+/g, '_')}`;
    
    // We keep the return path format matching what your DB expects
    const filePath = `uploads/${safeFileName}`;

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(filePath);

      // 🚀 Physically stream the binary buffer up to Azure's cloud infrastructure
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      return {
        filePath: `/${filePath}`, // Saves matching structural path in DB
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Azure cloud upload failed: ${errorMessage}`);
    }
  }

  async getFileStream(filePath: string): Promise<any> {
  try {
    // Chop off the first slash if it is there
    let cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    console.log('Fetching from Azure using exact path:', cleanPath);
    
    // Now it points directly to "1782765869711-381061448-bitcoin.pdf"
    const blockBlobClient = this.containerClient.getBlockBlobClient(cleanPath);
    
    const downloadResponse = await blockBlobClient.download(0);
    
    if (!downloadResponse.readableStreamBody) {
      throw new NotFoundException('File stream body could not be resolved from Azure');
    }

    return downloadResponse.readableStreamBody;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new NotFoundException(`Could not retrieve file from Azure: ${errorMessage}`);
  }
}
}