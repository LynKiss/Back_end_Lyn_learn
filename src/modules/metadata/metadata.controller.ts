import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MetadataService } from './metadata.service';

@ApiTags('metadata')
@Controller()
export class MetadataController {
  constructor(private readonly metadata: MetadataService) {}

  @Get('languages')
  languages() {
    return this.metadata.getLanguages();
  }

  @Get('level-scales')
  levelScales() {
    return this.metadata.getLevelScales();
  }
}
