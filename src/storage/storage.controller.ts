import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard) // Only logged-in users can upload files
  @UseInterceptors(FileInterceptor('file')) // Intercept the multipart 'file' field
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.storageService.saveFile(file);
  }
}