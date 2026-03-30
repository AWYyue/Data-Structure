import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ScenicArea } from './ScenicArea';
import { RoadGraphEdge } from './RoadGraphEdge';

@Entity('road_graph_nodes')
export class RoadGraphNode {
  @PrimaryGeneratedColumn('uuid')
  id: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  scenicAreaId: string = '';

  @Column({ type: 'varchar', length: 50, nullable: false })
  type: string = ''; // attraction, facility, junction

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string = '';

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null = null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null = null;

  @ManyToOne(() => ScenicArea, scenicArea => scenicArea.roadGraphNodes)
  scenicArea!: ScenicArea;

  @OneToMany(() => RoadGraphEdge, edge => edge.fromNode)
  outgoingEdges!: RoadGraphEdge[];

  @OneToMany(() => RoadGraphEdge, edge => edge.toNode)
  incomingEdges!: RoadGraphEdge[];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
