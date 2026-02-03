import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

@Controller('api/admin')
export class AdminController {
    constructor(private readonly supabase: SupabaseService) { }

    // ========== COMPANIES ==========

    @Get('companies')
    async getCompanies() {
        return this.supabase.getAllCompanies();
    }

    @Post('companies')
    async createCompany(@Body() data: { name: string; industry?: string; agent_count?: number }) {
        return this.supabase.createCompany(data);
    }

    @Put('companies/:id')
    async updateCompany(@Param('id') id: string, @Body() data: Partial<{ name: string; industry: string; agent_count: number }>) {
        return this.supabase.updateCompany(id, data);
    }

    @Delete('companies/:id')
    async deleteCompany(@Param('id') id: string) {
        await this.supabase.deleteCompany(id);
        return { success: true };
    }

    // ========== BRANDS ==========

    @Get('brands')
    async getBrands() {
        return this.supabase.getAllBrands();
    }

    @Post('brands')
    async createBrand(@Body() data: { name: string; company_id: string; color?: string }) {
        return this.supabase.createBrand(data);
    }

    @Put('brands/:id')
    async updateBrand(@Param('id') id: string, @Body() data: Partial<{ name: string; company_id: string; color: string }>) {
        return this.supabase.updateBrand(id, data);
    }

    @Delete('brands/:id')
    async deleteBrand(@Param('id') id: string) {
        await this.supabase.deleteBrand(id);
        return { success: true };
    }

    // ========== TEAMS ==========

    @Get('teams')
    async getTeams() {
        return this.supabase.getAllTeams();
    }

    @Post('teams')
    async createTeam(@Body() data: { name: string; brand_id: string; member_count?: number }) {
        return this.supabase.createTeam(data);
    }

    @Put('teams/:id')
    async updateTeam(@Param('id') id: string, @Body() data: Partial<{ name: string; brand_id: string; member_count: number }>) {
        return this.supabase.updateTeam(id, data);
    }

    @Delete('teams/:id')
    async deleteTeam(@Param('id') id: string) {
        await this.supabase.deleteTeam(id);
        return { success: true };
    }

    // ========== AGENTS ==========

    @Get('agents')
    async getAgents() {
        return this.supabase.getAllAgents();
    }

    @Post('agents')
    async createAgent(@Body() data: { name: string; team_id: string; email?: string; role?: string; autonomy_level?: number; policies?: object }) {
        return this.supabase.createAgent(data);
    }

    @Put('agents/:id')
    async updateAgent(@Param('id') id: string, @Body() data: Partial<{ name: string; team_id: string; email: string; role: string; autonomy_level: number; policies: object }>) {
        return this.supabase.updateAgent(id, data);
    }

    @Delete('agents/:id')
    async deleteAgent(@Param('id') id: string) {
        await this.supabase.deleteAgent(id);
        return { success: true };
    }
}
