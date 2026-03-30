import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'varchar', length: 50, nullable: false })
  type: string = ''; // foodie_master, photography_master, exploration_pioneer, social_master

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string = '';

  @Column({ type: 'text', nullable: true })
  description: string = '';

  @ManyToOne(() => User, user => user.achievements)
  user!: User;

  @CreateDateColumn()
  earnedAt: Date = new Date();
}
