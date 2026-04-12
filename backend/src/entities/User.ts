import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserBehavior } from './UserBehavior';
import { Achievement } from './Achievement';
import { Diary } from './Diary';
import { stringArrayJsonTransformer } from '../utils/stringArrayField';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string = '';

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  username: string = '';

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false })
  passwordHash: string = '';

  @Column({ type: 'text', nullable: true, transformer: stringArrayJsonTransformer })
  interests: string[] = [];

  @Column({ type: 'json', nullable: true })
  interestWeights: any = {};

  @Column({ type: 'text', nullable: true, transformer: stringArrayJsonTransformer })
  viewedItems: string[] = [];

  @Column({ type: 'text', nullable: true, transformer: stringArrayJsonTransformer })
  favorites: string[] = [];

  @Column({ type: 'text', nullable: true, transformer: stringArrayJsonTransformer })
  dislikedCategories: string[] = [];

  @OneToMany(() => UserBehavior, behavior => behavior.user)
  behaviors!: UserBehavior[];

  @OneToMany(() => Achievement, achievement => achievement.user)
  achievements!: Achievement[];

  @OneToMany(() => Diary, diary => diary.user)
  diaries!: Diary[];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
