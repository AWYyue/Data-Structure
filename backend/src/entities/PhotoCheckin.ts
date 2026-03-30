import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { PhotoSpot } from './PhotoSpot';

@Entity('photo_checkins')
export class PhotoCheckin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  photoSpotId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string | null = null;

  @Column({ type: 'text', nullable: false })
  photoUrl: string = '';

  @Column({ type: 'text', nullable: true })
  caption: string = '';

  @Column({ type: 'integer', default: 0 })
  likes: number = 0;

  @ManyToOne(() => PhotoSpot, (photoSpot) => photoSpot.checkins)
  photoSpot!: PhotoSpot;

  @CreateDateColumn()
  createdAt: Date = new Date();
}

