import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SocialTeamMember } from './SocialTeamMember';

@Entity('social_teams')
export class SocialTeam {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, nullable: false })
  name: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  creatorUserId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: true })
  scenicAreaId: string | null = null;

  @Column({ type: 'varchar', length: 12, nullable: false, unique: true })
  inviteCode: string = '';

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'inactive' = 'active';

  @OneToMany(() => SocialTeamMember, (member) => member.team)
  members!: SocialTeamMember[];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}

