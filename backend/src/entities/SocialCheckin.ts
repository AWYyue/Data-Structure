import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('social_checkins')
export class SocialCheckin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'varchar', length: 120, nullable: false })
  username: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  attractionId: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false })
  attractionName: string = '';

  @Column({ type: 'varchar', length: 36, nullable: true })
  scenicAreaId: string | null = null;

  @Column({ type: 'text', nullable: true })
  photo: string | null = null;

  @Column({ type: 'text', nullable: true })
  text: string | null = null;

  @Column({ type: 'integer', default: 0 })
  likes: number = 0;

  @Column({ type: 'integer', default: 0 })
  comments: number = 0;

  @CreateDateColumn()
  timestamp: Date = new Date();
}

