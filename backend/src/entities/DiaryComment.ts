import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Diary } from './Diary';
import { User } from './User';

@Entity('diary_comments')
@Index('IDX_DIARY_COMMENT_DIARY', ['diaryId'])
@Index('IDX_DIARY_COMMENT_USER', ['userId'])
@Index('IDX_DIARY_COMMENT_PARENT', ['parentCommentId'])
export class DiaryComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  diaryId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: true })
  parentCommentId: string | null = null;

  @Column({ type: 'text', nullable: false })
  content: string = '';

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number | null = null;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean = false;

  @ManyToOne(() => Diary, diary => diary.comments)
  diary!: Diary;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => DiaryComment, comment => comment.replies, { nullable: true })
  parentComment!: DiaryComment | null;

  @OneToMany(() => DiaryComment, comment => comment.parentComment)
  replies!: DiaryComment[];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
