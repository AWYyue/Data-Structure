import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { ScenicArea } from './ScenicArea';
import { Food } from './Food';

@Entity('facilities')
@Index('IDX_FACILITY_SCENIC_AREA', ['scenicAreaId'])
@Index('IDX_FACILITY_NAME', ['name'])
@Index('IDX_FACILITY_CATEGORY', ['category'])
@Index('IDX_FACILITY_SCENIC_CATEGORY', ['scenicAreaId', 'category'])
export class Facility {
  @PrimaryGeneratedColumn('uuid')
  id: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  scenicAreaId: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string = '';

  @Column({ type: 'varchar', length: 50, nullable: false })
  category: string = '';

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null = null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null = null;

  @Column({ type: 'text', nullable: true })
  openingHours: string = '{}';

  @Column({ type: 'text', nullable: true })
  description: string = '';

  @ManyToOne(() => ScenicArea, scenicArea => scenicArea.facilities)
  scenicArea!: ScenicArea;

  @OneToMany(() => Food, food => food.facility)
  foods!: Food[];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
