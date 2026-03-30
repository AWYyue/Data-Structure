import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserBehavior } from './UserBehavior';
import { Achievement } from './Achievement';
import { Diary } from './Diary';

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

  @Column({ type: 'text', array: true, nullable: true })
  interests: string[] = [];

  @Column({ type: 'json', nullable: true })
  interestWeights: any = {};

  @Column({ type: 'text', array: true, nullable: true })
  viewedItems: string[] = [];

  @Column({ type: 'text', array: true, nullable: true })
  favorites: string[] = [];

  @Column({ type: 'text', array: true, nullable: true })
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