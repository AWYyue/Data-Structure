import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RoadGraphNode } from './RoadGraphNode';

@Entity('road_graph_edges')
export class RoadGraphEdge {
  @PrimaryGeneratedColumn('uuid')
  id: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  scenicAreaId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  fromNodeId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  toNodeId: string = '';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  distance: number = 0;

  @Column({ type: 'varchar', length: 50, nullable: true })
  roadType: string = '';

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  congestionFactor: number = 1.0;

  @Column({ type: 'text', nullable: true })
  allowedTransportation: string = '';

  @Column({ type: 'boolean', default: false })
  isElectricCartRoute: boolean = false;

  @Column({ type: 'boolean', default: false })
  isBicyclePath: boolean = false;

  @Column({ type: 'varchar', length: 20, nullable: true })
  transportation: string = '';

  @ManyToOne(() => RoadGraphNode, node => node.outgoingEdges)
  fromNode!: RoadGraphNode;

  @ManyToOne(() => RoadGraphNode, node => node.incomingEdges)
  toNode!: RoadGraphNode;

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}