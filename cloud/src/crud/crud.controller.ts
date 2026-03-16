import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CrudService } from './crud.service';

@Controller('api/crud')
export class CrudController {
  constructor(private readonly crud: CrudService) {}

  // Companies
  @Get('companies')
  getCompanies(): any {
    return this.crud.getCompanies();
  }

  @Post('companies')
  createCompany(@Body() data: any): any {
    return this.crud.createCompany(data);
  }

  @Put('companies/:id')
  updateCompany(@Param('id') id: string, @Body() data: any): any {
    return this.crud.updateCompany(id, data);
  }

  @Delete('companies/:id')
  deleteCompany(@Param('id') id: string): any {
    return this.crud.deleteCompany(id);
  }

  // Brands
  @Get('brands')
  getBrands(): any {
    return this.crud.getBrands();
  }

  @Post('brands')
  createBrand(@Body() data: any): any {
    return this.crud.createBrand(data);
  }

  @Put('brands/:id')
  updateBrand(@Param('id') id: string, @Body() data: any): any {
    return this.crud.updateBrand(id, data);
  }

  @Delete('brands/:id')
  deleteBrand(@Param('id') id: string): any {
    return this.crud.deleteBrand(id);
  }

  // Teams
  @Get('teams')
  getTeams(): any {
    return this.crud.getTeams();
  }

  @Post('teams')
  createTeam(@Body() data: any): any {
    return this.crud.createTeam(data);
  }

  @Put('teams/:id')
  updateTeam(@Param('id') id: string, @Body() data: any): any {
    return this.crud.updateTeam(id, data);
  }

  @Delete('teams/:id')
  deleteTeam(@Param('id') id: string): any {
    return this.crud.deleteTeam(id);
  }

  // Users
  @Get('users')
  getUsers(): any {
    return this.crud.getUsers();
  }

  @Post('users')
  createUser(@Body() data: any): any {
    return this.crud.createUser(data);
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() data: any): any {
    return this.crud.updateUser(id, data);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string): any {
    return this.crud.deleteUser(id);
  }
}
