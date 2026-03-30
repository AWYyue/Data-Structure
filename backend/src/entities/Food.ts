import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Facility } from './Facility';

@Entity('foods')
@Index('IDX_FOOD_FACILITY', ['facilityId'])
@Index('IDX_FOOD_CUISINE', ['cuisine'])
@Index('IDX_FOOD_POPULARITY', ['popularity'])
@Index('IDX_FOOD_AVERAGE_RATING', ['averageRating'])
export class Food {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  facilityId: string = '';

  @Column({ type: 'varchar', length: 50, nullable: true })
  cuisine: string = '';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number | null = null;

  @Column({ type: 'text', nullable: true })
  description: string = '';

  @Column({ type: 'integer', default: 0 })
  popularity: number = 0;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number = 0;

  @Column({ type: 'integer', default: 0 })
  reviewCount: number = 0;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[] = [];

  @Column({ type: 'boolean', default: false })
  isSeasonalSpecial: boolean = false;

  @ManyToOne(() => Facility, facility => facility.foods)
  facility!: Facility;

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
