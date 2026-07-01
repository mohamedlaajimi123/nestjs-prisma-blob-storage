import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards, 
  Req, 
  Get,
  Res,
  StreamableFile,
  Param,
  HttpCode,
  HttpStatus,
  Delete
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response } from 'express';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
   // Blocks unauthenticated users instantly
  @UseInterceptors(FileInterceptor('file')) // Extracts the form-data field named 'file'
  async uploadAsset(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest, // Contains user metadata injected by your JwtStrategy
  ) {
    // Standard Passport payload handles look for user.id or user.userId
    const userId = req.user.id || req.user.userId;
    
    return this.assetsService.createAsset(file, userId);
  }
  
  @Get(':id')
  async downloadAsset(
  @Param('id') id: string,
  @Req() req: AuthenticatedRequest,
  @Res({ passthrough: true }) res: Response,
  ) {
      

  const userId = req.user.userId;

  const { stream, mimeType, filename } = await this.assetsService.getAssetFile(id, userId);
    
  // Set response headers so the client knows what kind of file it is
  res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
  });

    return stream;
  }

  @Get()
  async listMysAssets(@Req() req: AuthenticatedRequest){
    const userId = req.user.id || req.user.userId;
    return this.assetsService.listAssetsByUser(userId);
  }

  @Post(':id/sas')
  async generateSercureAccessUrl(
    @Param('id') id : string,
    @Req() req: AuthenticatedRequest
  ){
    const userId = req.user.id ||req.user.userId;
    //generate a 15 minute temporary read link direct to azure Blob
    const sasUrl = await this.assetsService.generateBlobSasUrl(id,userId);
    return {sasUrl};
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAsset(
    @Param('id') id : string,
    @Req() req : AuthenticatedRequest
  ){
    const userId = req.user.id || req.user.userId;
    await this.assetsService.deleteAsset(id,userId);

  }
}