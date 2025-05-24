import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: 'ID del usuario que realiza la orden' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'ID del carrito asociado a la orden' })
  @IsString()
  @IsNotEmpty()
  cartId: string;
} 