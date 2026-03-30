import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { SocialTeam } from './SocialTeam';

@Entity('social_team_members')
export class SocialTeamMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  teamId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: 'creator' | 'member' = 'member';

  @ManyToOne(() => SocialTeam, (team) => team.members)
  team!: SocialTeam;

  @CreateDateColumn()
  joinedAt: Date = new Date();
}

