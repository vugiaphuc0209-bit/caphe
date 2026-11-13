import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Type } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

// Tạo nhanh controller CRUD cho 1 bảng: GET / , GET /:id , POST / , PUT /:id , DELETE /:id
export function makeCrud(path: string, entity: any): Type<any> {
  @Controller(path)
  class CrudController {
    constructor(@InjectRepository(entity) private readonly repo: Repository<any>) {}

    @Get()
    findAll() {
      return this.repo.find({ order: { id: 'ASC' } })
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
      const row = await this.repo.findOneBy({ id: Number(id) })
      if (!row) throw new NotFoundException('Không tìm thấy')
      return row
    }

    @Post()
    create(@Body() body: any) {
      delete body.id
      return this.repo.save(this.repo.create(body))
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: any) {
      await this.findOne(id)
      delete body.id
      await this.repo.update(Number(id), body)
      return this.findOne(id)
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
      await this.findOne(id)
      await this.repo.delete(Number(id))
      return { deleted: true }
    }
  }
  return CrudController
}
