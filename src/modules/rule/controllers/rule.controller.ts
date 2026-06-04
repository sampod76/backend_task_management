import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RuleService } from '../services/rule.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ROLE } from '../../user/user.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LoggingInterceptor } from '../../../common/interceptors/logging.interceptor';

import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { AuthPayload } from '../../auth/auth.types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  CreateAutomationRuleInput,
  CreateAutomationRuleSchema,
  UpdateAutomationRuleInput,
  UpdateAutomationRuleSchema,
} from '../schemas/create-rule.schema';
import {
  RuleQueryFilter,
  RuleQueryFilterSchema,
} from '../schemas/rule.filter.schema';

/**
 * Admin API boundary for automation rules.
 *
 * Flow:
 * HTTP request
 * -> JwtAuthGuard/RolesGuard
 * -> ZodValidationPipe
 * -> RuleService
 * -> RuleRepository/child operation services
 * -> Prisma relation tables
 *
 * Warning:
 * This controller accepts the developer-friendly rule shape. Do not bypass the
 * ZodValidationPipe for write endpoints, because the mapper assumes strict
 * action discriminators and condition operators.
 *
 * @see src/modules/rule/schemas/create-rule.schema.ts
 * @see src/modules/rule/services/rule.service.ts
 * @see src/modules/rule/mappers/automation-rule.mapper.ts
 */
@Controller('rule')
@Roles(ROLE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class RuleController {
  constructor(private readonly ruleService: RuleService) {}

  @Post()
  @UseInterceptors(LoggingInterceptor)
  @HttpCode(HttpStatus.CREATED)
  /**
   * Creates a rule and its relation-backed condition/action rows in one Prisma
   * nested create. The response is mapped back into runtime/public shape so API
   * clients do not need to know about child config tables.
   */
  create(
    @Body(new ZodValidationPipe(CreateAutomationRuleSchema))
    data: CreateAutomationRuleInput,
    // @Body() body: CreateAutomationRuleDto,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.ruleService.create(data, user);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query(new ZodValidationPipe(RuleQueryFilterSchema))
    query: RuleQueryFilter,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.ruleService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.ruleService.findById(id, user);
  }

  // @Patch(':ruleId/actions/:actionId')
  // updateActionConfig(
  //   @Param('ruleId') ruleId: string,
  //   @Param('actionId') actionId: string,
  //   @Body(new ZodValidationPipe(UpdateAutomationRuleActionConfigSchema))
  //   data: UpdateAutomationRuleActionConfigInput,
  //   @CurrentUser() user: AuthPayload,
  // ) {
  //   return this.ruleService.updateActionConfig(ruleId, actionId, data, user);
  // }

  @Patch(':id')
  /**
   * Applies sparse parent, condition, and action operations. Child updates are
   * delegated to services so partial update and delete semantics stay isolated
   * from the HTTP layer.
   */
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAutomationRuleSchema))
    updateRuleDto: UpdateAutomationRuleInput,
    @CurrentUser() user: AuthPayload,
  ) {
    return this.ruleService.update(id, updateRuleDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthPayload) {
    return this.ruleService.remove(id, user);
  }
}
