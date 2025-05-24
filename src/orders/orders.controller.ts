import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  private readonly logger = new Logger('OrdersController');

  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern({ cmd: 'create_order' })
  async create(@Payload() data: { userId: string, cart: any }) {
    try {
      this.logger.log(`Received create order request with data: ${JSON.stringify(data)}`);
      const result = await this.ordersService.create(data);
      this.logger.log(`Order created successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating order: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'find_all_orders' })
  findAll(@Payload() data: { userId: string }) {
    this.logger.log(`Received find all orders request for user ${data.userId}`);
    return this.ordersService.findAll(data.userId);
  }

  @MessagePattern({ cmd: 'find_order' })
  findOne(@Payload() data: { id: string }) {
    this.logger.log(`Received find order request for id ${data.id}`);
    return this.ordersService.findOne(data.id);
  }

  @MessagePattern({ cmd: 'finalize_order' })
  finalizeOrder(@Payload() data: { id: string }) {
    this.logger.log(`Received finalize order request for id ${data.id}`);
    return this.ordersService.finalizeOrder(data.id);
  }

  @MessagePattern({ cmd: 'cancel_order' })
  cancelOrder(@Payload() data: { id: string }) {
    this.logger.log(`Received cancel order request for id ${data.id}`);
    return this.ordersService.cancelOrder(data.id);
  }
} 