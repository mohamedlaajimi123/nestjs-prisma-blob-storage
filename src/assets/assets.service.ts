import { StreamableFile, NotFoundException, ForbiddenException, Injectable, BadRequestException } from '@nestjs/common';
import { BlobServiceClient, ContainerClient, BlobSASPermissions } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AssetsService {
  private containerClient: ContainerClient;
  private connectionString: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {
    this.connectionString = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING')!;
    
    // Fallback logic: If ConfigService returns undefined, default directly to 'uploads'
    const containerName = this.config.get<string>('AZURE_CONTAINER_NAME') || 'uploads';

    const blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
    this.containerClient = blobServiceClient.getContainerClient(containerName);
  }

  /**
   * Processes a multipart file upload, saves the file data via the local StorageService,
   * and records the asset metadata and user tracking relationship inside PostgreSQL using Prisma.
   */
  async createAsset(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const fileMetadata = await this.storageService.saveFile(file);

      const newAsset = await this.prisma.asset.create({
        data: {
          filename: fileMetadata.fileName,
          blobName: fileMetadata.filePath,
          mimeType: fileMetadata.mimeType,
          sizeInBytes: fileMetadata.size,
          uploadedById: userId,
        },
      });

      return newAsset;
    } catch (error) {
      throw new BadRequestException(`Failed to process and save asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a file stream for a specific asset by its ID. Enforces ownership rules
   * and provides an automatic path-fallback mechanism if the primary folder structure fails.
   */
  async getAssetFile(assetId: string, userId: string): Promise<{ stream: StreamableFile; mimeType: string; filename: string }> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset record not found');
    }

    if (asset.uploadedById !== userId) {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    const primaryAzurePath = asset.blobName.startsWith('/') ? asset.blobName.slice(1) : asset.blobName;

    try {
      console.log('Attempting primary Azure fetch path:', primaryAzurePath);
      const fileStream = await this.storageService.getFileStream(primaryAzurePath);

      return {
        stream: new StreamableFile(fileStream as any),
        mimeType: asset.mimeType,
        filename: asset.filename,
      };
    } catch (firstError) {
      const pureAzureFilename = asset.blobName.split('/').pop();

      if (!pureAzureFilename) {
        throw new NotFoundException('Invalid asset file path structure');
      }

      console.warn(`Primary path failed. Attempting fallback filename path:`, pureAzureFilename);

      try {
        const fileStream = await this.storageService.getFileStream(pureAzureFilename);

        return {
          stream: new StreamableFile(fileStream as any),
          mimeType: asset.mimeType,
          filename: asset.filename,
        };
      } catch (secondError) {
        throw new NotFoundException(`Could not retrieve file from Azure under any path variation.`);
      }
    }
  }
  
  /**
   * Fetches all asset metadata records belonging to the authenticated user from the database.
   */
  async listAssetsByUser(userId: string) {
    return this.prisma.asset.findMany({
      where: { uploadedById: userId },
    });
  }

  /**
   * Generates a secure, time-limited Shared Access Signature (SAS) URL directly from Azure Blob Storage.
   * This permits the user to download the specific file directly from Azure's CDN for up to 15 minutes.
   */
  async generateBlobSasUrl(id: string, userId: string) {
    const asset = await this.verifyAssetOwnership(id, userId);
    
    // Safely format the path to strip out leading forward slashes
    const cleanBlobPath = asset.blobName.startsWith('/') ? asset.blobName.slice(1) : asset.blobName;
    const blockBlobClient = this.containerClient.getBlobClient(cleanBlobPath);

    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + 15);

    const sasUrl = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: expiresOn,
      startsOn: new Date(),
    });

    return sasUrl;
  }

  /**
   * Private internal validation helper. Verifies that the resource exists and confirms
   * that the current user has the correct authorization to access it.
   */
  private async verifyAssetOwnership(id: string, userId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.uploadedById !== userId) throw new ForbiddenException('Access to asset denied');
    
    return asset;
  }

  /**
   * Deletes the target binary object permanently from the remote Azure Cloud container
   * and subsequently flushes the tracking metadata record out of the SQL database.
   */
  async deleteAsset(id: string, userId: string) {
    const asset = await this.verifyAssetOwnership(id, userId);
    
    // Fixed: Stripping the leading slash so Azure can map the container folders cleanly
    const cleanBlobPath = asset.blobName.startsWith('/') ? asset.blobName.slice(1) : asset.blobName;

    console.log('Targeting Blob path:', cleanBlobPath);

    // Fixed: Passing the clean path instead of the unedited asset.blobName
    const blockBlobClient = this.containerClient.getBlockBlobClient(cleanBlobPath);

    await blockBlobClient.deleteIfExists();

    await this.prisma.asset.delete({
      where: { id },
    });
  }
}