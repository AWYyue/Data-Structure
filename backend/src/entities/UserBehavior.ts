import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from './User';

@Entity('user_behaviors')
@Index('IDX_USER_BEHAVIOR_USER_TIME', ['userId', 'timestamp'])
@Index('IDX_USER_BEHAVIOR_TARGET', ['targetType', 'targetId'])
export class UserBehavior {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'varchar', length: 50, nullable: false })
  behaviorType: string = ''; // browse, favorite, rate, dislike

  @Column({ type: 'varchar', length: 50, nullable: false })
  targetType: string = ''; // scenic_area, diary, food

  @Column({ type: 'varchar', length: 36, nullable: false })
  targetId: string = '';

  @Column({ type: 'integer', nullable: true })
  duration: number | null = null; // 浏览时长（秒）

  @Column({ type: 'integer', nullable: true })
  rating: number | null = null; // 评分（1-5）

  @ManyToOne(() => User, user => user.behaviors)
  user!: User;

  @CreateDateColumn()
  timestamp: Date = new Date();
}
