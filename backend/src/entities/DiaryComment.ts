import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Diary } from './Diary';

@Entity('diary_comments')
@Index('IDX_DIARY_COMMENT_DIARY', ['diaryId'])
@Index('IDX_DIARY_COMMENT_USER', ['userId'])
export class DiaryComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  diaryId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'text', nullable: false })
  content: string = '';

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number | null = null;

  @ManyToOne(() => Diary, diary => diary.comments)
  diary!: Diary;

  @CreateDateColumn()
  createdAt: Date = new Date();
}
