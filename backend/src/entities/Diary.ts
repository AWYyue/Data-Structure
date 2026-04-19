import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { DiaryComment } from './DiaryComment';
import { stringArrayJsonTransformer } from '../utils/stringArrayField';

@Entity('diaries')
export class Diary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string = '';

  @Column({ type: 'text', nullable: true })
  content: string = '';

  @Column({ type: 'blob', nullable: true })
  compressedContent: Buffer = Buffer.alloc(0);

  @Column({ type: 'varchar', length: 255, nullable: true })
  destination: string = '';

  @Column({ type: 'date', nullable: true })
  visitDate: Date | null = null;

  @Column({ type: 'text', nullable: true, transformer: stringArrayJsonTransformer })
  route: string[] = [];

  @Column({ type: 'text', nullable: true, transformer: stringArrayJsonTransformer })
  imageUrls: string[] = [];

  @Column({ type: 'text', nullable: true, transformer: stringArrayJsonTransformer })
  videoUrls: string[] = [];

  @Column({ type: 'integer', default: 0 })
  popularity: number = 0;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number = 0;

  @Column({ type: 'integer', default: 0 })
  reviewCount: number = 0;

  @Column({ type: 'boolean', default: false })
  isShared: boolean = false;

  @ManyToOne(() => User, user => user.diaries)
  user!: User;

  @OneToMany(() => DiaryComment, comment => comment.diary)
  comments!: DiaryComment[];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
