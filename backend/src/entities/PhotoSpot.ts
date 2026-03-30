import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PhotoCheckin } from './PhotoCheckin';

@Entity('photo_spots')
export class PhotoSpot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  scenicAreaId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: true })
  attractionId: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string = '';

  @Column({ type: 'text', nullable: true })
  description: string = '';

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: false })
  latitude: number = 0;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: false })
  longitude: number = 0;

  @Column({ type: 'varchar', length: 100, nullable: false, default: '' })
  bestTime: string = '';

  @Column({ type: 'integer', default: 0 })
  popularity: number = 0;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'medium' })
  crowdLevel: 'low' | 'medium' | 'high' = 'medium';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'good' })
  lightingCondition: 'excellent' | 'good' | 'fair' | 'poor' = 'good';

  @Column({ type: 'text', nullable: true })
  examplePhotos: string = '[]';

  @OneToMany(() => PhotoCheckin, (checkin) => checkin.photoSpot)
  checkins!: PhotoCheckin[];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}

