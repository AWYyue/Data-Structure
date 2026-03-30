import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { IndoorLocation, IndoorPathPoint, IndoorStructure } from '../services/indoorNavigationService';

interface IndoorMapComponentProps {
  building: IndoorStructure;
  currentFloor: number;
  path?: IndoorPathPoint[];
  startLocation?: IndoorLocation | null;
  endLocation?: IndoorLocation | null;
  selectedPointIds?: string[];
  onPointSelect?: (point: { id: string; name: string; type: 'room' | 'entrance' | 'elevator'; floor: number }) => void;
}

const IndoorMapComponent: React.FC<IndoorMapComponentProps> = ({
  building,
  currentFloor,
  path = [],
  startLocation,
  endLocation,
  selectedPointIds = [],
  onPointSelect,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) {
      return;
    }

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -0.5,
      maxZoom: 3.5,
      zoomSnap: 0.25,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstance.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);
    L.control.scale({ imperial: false, metric: true }).addTo(map);

    return () => {
      map.remove();
      mapInstance.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const group = layerGroupRef.current;
    if (!map || !group) {
      return;
    }

    group.clearLayers();

    const floor = building.floors.find((item) => item.number === currentFloor);
    if (!floor) {
      return;
    }

    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [floor.height, floor.width],
    ];

    L.rectangle(bounds, {
      color: '#cbd5e1',
      weight: 2,
      fillColor: '#f8fafc',
      fillOpacity: 0.95,
    }).addTo(group);

    const corridorX = floor.width / 2;
    const corridorY = floor.height / 2;

    L.polyline(
      [
        [0, corridorX],
        [floor.height, corridorX],
      ],
      { color: '#cbd5e1', weight: 10, opacity: 0.8 },
    ).addTo(group);

    L.polyline(
      [
        [corridorY, 0],
        [corridorY, floor.width],
      ],
      { color: '#cbd5e1', weight: 10, opacity: 0.8 },
    ).addTo(group);

    floor.rooms.forEach((room) => {
      const isSelected = selectedPointIds.includes(room.id);
      const marker = L.circleMarker([room.location.y, room.location.x], {
        radius: isSelected ? 9 : 7,
        color: isSelected ? '#1e3a8a' : '#1d4ed8',
        fillColor: isSelected ? '#60a5fa' : '#3b82f6',
        weight: isSelected ? 2.5 : 1.5,
        fillOpacity: 0.92,
      })
        .addTo(group)
        .bindPopup(`<b>${room.number}</b><br/>${room.name}`);

      marker.on('click', () => {
        onPointSelect?.({
          id: room.id,
          name: `${room.number} ${room.name}`,
          type: 'room',
          floor: room.location.floor,
        });
      });
    });

    building.elevators
      .filter((elevator) => elevator.floors.includes(currentFloor))
      .forEach((elevator) => {
        const isSelected = selectedPointIds.includes(elevator.id);
        const marker = L.circleMarker([elevator.location.y, elevator.location.x], {
          radius: isSelected ? 10 : 8,
          color: isSelected ? '#7f1d1d' : '#b91c1c',
          fillColor: isSelected ? '#f87171' : '#ef4444',
          weight: isSelected ? 2.8 : 2,
          fillOpacity: 0.95,
        })
          .addTo(group)
          .bindPopup(`<b>${elevator.name}</b><br/>平均等待 ${elevator.averageWaitTime} 秒`);

        marker.on('click', () => {
          onPointSelect?.({ id: elevator.id, name: elevator.name, type: 'elevator', floor: currentFloor });
        });
      });

    building.entrances
      .filter((entrance) => entrance.location.floor === currentFloor)
      .forEach((entrance) => {
        const isSelected = selectedPointIds.includes(entrance.id);
        const marker = L.circleMarker([entrance.location.y, entrance.location.x], {
          radius: isSelected ? 9 : 7,
          color: isSelected ? '#065f46' : '#047857',
          fillColor: isSelected ? '#34d399' : '#10b981',
          weight: isSelected ? 2.8 : 2,
          fillOpacity: 0.9,
        })
          .addTo(group)
          .bindPopup(`<b>${entrance.name}</b>`);

        marker.on('click', () => {
          onPointSelect?.({
            id: entrance.id,
            name: entrance.name,
            type: 'entrance',
            floor: entrance.location.floor,
          });
        });
      });

    const floorPath = path.filter((point) => point.floor === currentFloor);
    if (floorPath.length > 1) {
      const coordinates = floorPath.map((point) => [point.y, point.x] as [number, number]);

      L.polyline(coordinates, {
        color: '#ffffff',
        weight: 8,
        opacity: 0.9,
        lineCap: 'round',
      }).addTo(group);

      L.polyline(coordinates, {
        color: '#2563eb',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(group);
    }

    if (startLocation && startLocation.floor === currentFloor) {
      L.circleMarker([startLocation.y, startLocation.x], {
        radius: 10,
        color: '#166534',
        fillColor: '#22c55e',
        weight: 2.5,
        fillOpacity: 0.95,
      })
        .addTo(group)
        .bindPopup('<b>起点</b>');
    }

    if (endLocation && endLocation.floor === currentFloor) {
      L.circleMarker([endLocation.y, endLocation.x], {
        radius: 10,
        color: '#991b1b',
        fillColor: '#ef4444',
        weight: 2.5,
        fillOpacity: 0.95,
      })
        .addTo(group)
        .bindPopup('<b>终点</b>');
    }

    map.fitBounds(bounds, { padding: [28, 28] });
  }, [building, currentFloor, endLocation, onPointSelect, path, selectedPointIds, startLocation]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: 460,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.18)',
        border: '1px solid rgba(148, 163, 184, 0.28)',
      }}
    />
  );
};

export default IndoorMapComponent;
