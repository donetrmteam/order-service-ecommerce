import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Order, OrderStatus } from './entities/order.entity';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService');

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @Inject('PRODUCT_SERVICE') private productClient: ClientProxy,
    @Inject('CART_SERVICE') private cartClient: ClientProxy,
  ) {}

  async create(data: { userId: string, cart: any }) {
    try {
      const { userId, cart } = data;
      this.logger.log(`Creating order for user ${userId} with cart: ${JSON.stringify(cart)}`);

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Carrito vacío o no encontrado');
      }

      for (const item of cart.items) {
        try {
          this.logger.log(`Checking stock for product ${item.productId}`);
          const stockResponse = await lastValueFrom(
            this.productClient.send(
              { cmd: 'check_product_stock' },
              { id: item.productId, requestedQuantity: item.quantity }
            )
          );

          if (!stockResponse.hasStock) {
            throw new BadRequestException(`No hay suficiente stock para el producto ${item.name}. Stock disponible: ${stockResponse.currentStock}`);
          }
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          this.logger.error(`Error checking stock for product ${item.productId}: ${JSON.stringify(error)}`);
          throw new Error(`Error al verificar el stock del producto ${item.productId}`);
        }
      }

      const order = this.orderRepository.create({
        userId,
        items: cart.items,
        status: OrderStatus.PENDIENTE,
        total: cart.totalAmount,
      });

      this.logger.log(`Order created with data: ${JSON.stringify(order)}`);

      for (const item of cart.items) {
        try {
          this.logger.log(`Updating stock for product ${item.productId}`);
          await lastValueFrom(
            this.productClient.send(
              { cmd: 'update_product_stock' },
              { id: item.productId, quantity: -item.quantity }
            )
          );
        } catch (error) {
          this.logger.error(`Error updating stock for product ${item.productId}: ${JSON.stringify(error)}`);
          throw new Error(`Error al actualizar el stock del producto ${item.productId}`);
        }
      }

      const savedOrder = await this.orderRepository.save(order);
      this.logger.log(`Order saved successfully: ${JSON.stringify(savedOrder)}`);

      try {
        this.logger.log(`Clearing cart for user ${userId}`);
        await lastValueFrom(
          this.cartClient.send(
            { cmd: 'clear_cart' },
            { userId }
          )
        );
        this.logger.log(`Cart cleared successfully for user ${userId}`);
      } catch (error) {
        this.logger.error(`Error clearing cart: ${JSON.stringify(error)}`);
      }

      return savedOrder;
    } catch (error) {
      this.logger.error(`Error in create order: ${JSON.stringify(error)}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(error.message || 'Error al crear la orden');
    }
  }

  async findAll(userId: string) {
    return this.orderRepository.find({ where: { userId } });
  }

  async findOne(id: string) {
    return this.orderRepository.findOne({ where: { id } });
  }

  async finalizeOrder(id: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new Error('Orden no encontrada');
    }
    if (order.status !== OrderStatus.PENDIENTE) {
      throw new Error('La orden no está en estado PENDIENTE');
    }

    order.status = OrderStatus.FINALIZADO;
    return this.orderRepository.save(order);
  }

  async cancelOrder(id: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new Error('Orden no encontrada');
    }
    if (order.status !== OrderStatus.PENDIENTE) {
      throw new Error('La orden no está en estado PENDIENTE');
    }

    for (const item of order.items) {
      await lastValueFrom(
        this.productClient.send(
          { cmd: 'update_product_stock' },
          { id: item.productId, quantity: item.quantity }
        )
      );
    }

    order.status = OrderStatus.CANCELADO;
    return this.orderRepository.save(order);
  }
} 