import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleGuard } from 'src/common/guards/role.guard';
import { UserRole } from 'src/entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Dashboard statistics (admin)',
    description: [
      'Returns a single response containing:',
      '- **orders**: byStatus counts, total revenue, avg order value, today/week/month counts, revenue-by-day chart data (last 30 days), last 10 orders',
      '- **products**: total, out-of-stock count, low-stock list, top-5 by units sold, top-5 by revenue, top-5 by views',
      '- **users**: total, new this week, new this month',
      '- **reviews**: total count, global average rating',
      '- **categories**: product count per category, revenue per category',
    ].join('\n'),
  })
  @ApiOkResponse({ description: 'Aggregated dashboard stats' })
  getStats() {
    return this.adminService.getStats();
  }
}
