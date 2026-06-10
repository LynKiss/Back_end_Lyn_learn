import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConversationService } from './conversation.service';
import { AddTurnDto, CreateConversationDto } from './dto/conversation.dto';

@ApiTags('speaking-conversation')
@Auth()
@Controller('speaking/conversations')
export class ConversationController {
  constructor(private readonly service: ConversationService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateConversationDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.service.list(userId);
  }

  @Get(':id')
  getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.getOne(userId, id);
  }

  @Post(':id/turns')
  addTurn(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddTurnDto,
  ) {
    return this.service.addTurn(userId, id, dto);
  }

  @Post(':id/finish')
  finish(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.finish(userId, id);
  }
}
