'use client';

import { useEffect, useState, RefObject } from 'react';

interface RailNetworkProps {
  gridRef: RefObject<HTMLDivElement | null>;
  activeStep?: number;
  completedSteps?: number[];
  totalSteps?: number;
}

interface ContainerPosition {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function RailNetwork({ 
  gridRef,
  activeStep, 
  completedSteps = [],
  totalSteps = 10 
}: RailNetworkProps) {
  const [containerPositions, setContainerPositions] = useState<ContainerPosition[]>([]);

  useEffect(() => {
    const updatePositions = () => {
      if (!gridRef.current) return;

      // Only use desktop containers (those with data-row attribute)
      // This avoids duplicate keys from mobile containers
      const desktopRows = gridRef.current.querySelectorAll('[data-row]');
      const positions: ContainerPosition[] = [];
      const seenIds = new Set<number>();

      desktopRows.forEach((row) => {
        const containers = row.querySelectorAll('[data-step-id]');
        containers.forEach((container) => {
          const rect = container.getBoundingClientRect();
          const gridRect = gridRef.current!.getBoundingClientRect();
          const stepId = parseInt(container.getAttribute('data-step-id') || '0');
          
          // Only add if we haven't seen this ID yet (avoid duplicates)
          if (!seenIds.has(stepId)) {
            seenIds.add(stepId);
            positions.push({
              id: stepId,
              x: rect.left - gridRect.left + rect.width / 2,
              y: rect.top - gridRect.top + rect.height / 2,
              width: rect.width,
              height: rect.height
            });
          }
        });
      });

      setContainerPositions(positions);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    
    // Also update after a short delay to ensure layout is complete
    const timeout = setTimeout(updatePositions, 100);

    return () => {
      window.removeEventListener('resize', updatePositions);
      clearTimeout(timeout);
    };
  }, [activeStep]);

  const isStepActive = (step: number) => activeStep === step;
  const isStepCompleted = (step: number) => completedSteps.includes(step);
  const isStepInActivePath = (step: number) => {
    if (!activeStep) return false;
    return step <= activeStep;
  };

  const getRailColor = (isActive: boolean, isCompleted: boolean) => {
    if (isCompleted) return '#10b981';
    if (isActive) return '#8b5cf6';
    return '#475569';
  };

  const getRailOpacity = (isActive: boolean, isCompleted: boolean) => {
    if (isCompleted || isActive) return 1;
    return 0.4;
  };

  const railWidth = 4;
  const railGap = 8;
  const sleeperWidth = 3;
  const sleeperLength = 20;
  const sleeperSpacing = 40;

  // Get positions for specific steps
  const getPos = (stepId: number) => {
    return containerPositions.find(p => p.id === stepId);
  };

  // Render rail between two points with variable opacity
  // Start and end sections (inside containers) are less visible
  // Middle section (between containers) is more visible
  const renderRail = (
    x1: number, y1: number,
    x2: number, y2: number,
    isInPath: boolean,
    isActive: boolean,
    isCompleted: boolean,
    fromStep?: number,
    toStep?: number
  ) => {
    if (!x1 || !y1 || !x2 || !y2) return null;

    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const numSleepers = Math.floor(length / sleeperSpacing);
    
    const railColor = getRailColor(isActive, isCompleted);
    const baseOpacity = getRailOpacity(isActive, isCompleted);

    // Determine if rail is primarily horizontal or vertical
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const isHorizontal = dx > dy;

    // Calculate rail gap offset based on orientation
    // For horizontal rails: gap is vertical (y offset)
    // For vertical rails: gap is horizontal (x offset)
    const gapOffsetX = isHorizontal ? 0 : railGap / 2;
    const gapOffsetY = isHorizontal ? railGap / 2 : 0;

    // Calculate container edge positions
    // We'll fade the first 25% and last 25% of the rail (inside containers)
    const fadeZone = 0.25; // 25% of rail length at each end
    const fadeStart = fadeZone;
    const fadeEnd = 1 - fadeZone;

    // Calculate points for three sections: start (faded), middle (visible), end (faded)
    const startX = x1;
    const startY = y1;
    const fadeStartX = x1 + (x2 - x1) * fadeStart;
    const fadeStartY = y1 + (y2 - y1) * fadeStart;
    const fadeEndX = x1 + (x2 - x1) * fadeEnd;
    const fadeEndY = y1 + (y2 - y1) * fadeEnd;
    const endX = x2;
    const endY = y2;

    // Opacity values: low for container sections, high for middle
    const containerOpacity = baseOpacity * 0.2; // Very low inside containers
    const middleOpacity = baseOpacity; // Full opacity between containers

    // Sleeper orientation: perpendicular to rail
    const sleeperAngle = angle + Math.PI / 2;
    const sleeperCos = Math.cos(sleeperAngle);
    const sleeperSin = Math.sin(sleeperAngle);

    // Use step IDs in key for uniqueness, fallback to coordinates
    const railKey = fromStep && toStep 
      ? `rail-${fromStep}-${toStep}` 
      : `rail-${x1}-${y1}-${x2}-${y2}`;
    
    return (
      <g key={railKey}>
        {/* Top rail - Start section (inside first container) */}
        <line
          x1={startX - gapOffsetX}
          y1={startY - gapOffsetY}
          x2={fadeStartX - gapOffsetX}
          y2={fadeStartY - gapOffsetY}
          stroke={railColor}
          strokeWidth={railWidth}
          opacity={containerOpacity}
          strokeLinecap="round"
        />
        {/* Top rail - Middle section (between containers) */}
        <line
          x1={fadeStartX - gapOffsetX}
          y1={fadeStartY - gapOffsetY}
          x2={fadeEndX - gapOffsetX}
          y2={fadeEndY - gapOffsetY}
          stroke={railColor}
          strokeWidth={railWidth}
          opacity={middleOpacity}
          strokeLinecap="round"
        />
        {/* Top rail - End section (inside second container) */}
        <line
          x1={fadeEndX - gapOffsetX}
          y1={fadeEndY - gapOffsetY}
          x2={endX - gapOffsetX}
          y2={endY - gapOffsetY}
          stroke={railColor}
          strokeWidth={railWidth}
          opacity={containerOpacity}
          strokeLinecap="round"
        />
        
        {/* Bottom rail - Start section (inside first container) */}
        <line
          x1={startX + gapOffsetX}
          y1={startY + gapOffsetY}
          x2={fadeStartX + gapOffsetX}
          y2={fadeStartY + gapOffsetY}
          stroke={railColor}
          strokeWidth={railWidth}
          opacity={containerOpacity}
          strokeLinecap="round"
        />
        {/* Bottom rail - Middle section (between containers) */}
        <line
          x1={fadeStartX + gapOffsetX}
          y1={fadeStartY + gapOffsetY}
          x2={fadeEndX + gapOffsetX}
          y2={fadeEndY + gapOffsetY}
          stroke={railColor}
          strokeWidth={railWidth}
          opacity={middleOpacity}
          strokeLinecap="round"
        />
        {/* Bottom rail - End section (inside second container) */}
        <line
          x1={fadeEndX + gapOffsetX}
          y1={fadeEndY + gapOffsetY}
          x2={endX + gapOffsetX}
          y2={endY + gapOffsetY}
          stroke={railColor}
          strokeWidth={railWidth}
          opacity={containerOpacity}
          strokeLinecap="round"
        />

        {/* Sleepers */}
        {Array.from({ length: numSleepers }).map((_, i) => {
          const t = (i + 1) / (numSleepers + 1);
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t;
          
          // Determine sleeper opacity based on location
          let sleeperOpacity = 0;
          if (isHorizontal) {
            // For horizontal rails: show sleepers in all sections
            if (t < fadeStart || t > fadeEnd) {
              // Inside containers - lower opacity
              sleeperOpacity = containerOpacity * 0.6;
            } else {
              // Between containers - higher opacity
              sleeperOpacity = middleOpacity * 0.6;
            }
          } else {
            // For vertical rails: only show sleepers in middle section (outside containers)
            if (t >= fadeStart && t <= fadeEnd) {
              sleeperOpacity = middleOpacity * 0.6;
            } else {
              return null; // No sleepers inside containers for vertical rails
            }
          }
          
          return (
            <line
              key={i}
              x1={x - sleeperLength / 2 * sleeperCos}
              y1={y - sleeperLength / 2 * sleeperSin}
              x2={x + sleeperLength / 2 * sleeperCos}
              y2={y + sleeperLength / 2 * sleeperSin}
              stroke="#64748b"
              strokeWidth={sleeperWidth}
              opacity={sleeperOpacity}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    );
  };

  // Get positions for rails
  const pos1 = getPos(1);
  const pos2 = getPos(2);
  const pos3 = getPos(3);
  const pos4 = getPos(4);
  const pos5 = getPos(5);
  const pos6 = getPos(6);
  const pos7 = getPos(7);
  const pos8 = getPos(8);
  const pos9 = getPos(9);
  const pos10 = getPos(10);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 hidden md:block">
      {containerPositions.length > 0 && (
        <svg 
          className="w-full h-full" 
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Sequential flow: 1→2→3→4→5→6→7→8→9→10 */}
          {pos1 && pos2 && renderRail(
            pos1.x, pos1.y,
            pos2.x, pos2.y,
            isStepCompleted(2) || isStepInActivePath(2),
            isStepActive(1) || isStepActive(2),
            isStepCompleted(2),
            1, 2
          )}
          {pos2 && pos3 && renderRail(
            pos2.x, pos2.y,
            pos3.x, pos3.y,
            isStepCompleted(3) || isStepInActivePath(3),
            isStepActive(2) || isStepActive(3),
            isStepCompleted(3),
            2, 3
          )}
          {pos3 && pos4 && renderRail(
            pos3.x, pos3.y,
            pos4.x, pos4.y,
            isStepCompleted(4) || isStepInActivePath(4),
            isStepActive(3) || isStepActive(4),
            isStepCompleted(4),
            3, 4
          )}
          {pos4 && pos5 && renderRail(
            pos4.x, pos4.y,
            pos5.x, pos5.y,
            isStepCompleted(5) || isStepInActivePath(5),
            isStepActive(4) || isStepActive(5),
            isStepCompleted(5),
            4, 5
          )}
          {pos5 && pos6 && renderRail(
            pos5.x, pos5.y,
            pos6.x, pos6.y,
            isStepCompleted(6) || isStepInActivePath(6),
            isStepActive(5) || isStepActive(6),
            isStepCompleted(6),
            5, 6
          )}
          {pos6 && pos7 && renderRail(
            pos6.x, pos6.y,
            pos7.x, pos7.y,
            isStepCompleted(7) || isStepInActivePath(7),
            isStepActive(6) || isStepActive(7),
            isStepCompleted(7),
            6, 7
          )}
          {pos7 && pos8 && renderRail(
            pos7.x, pos7.y,
            pos8.x, pos8.y,
            isStepCompleted(8) || isStepInActivePath(8),
            isStepActive(7) || isStepActive(8),
            isStepCompleted(8),
            7, 8
          )}
          {pos8 && pos9 && renderRail(
            pos8.x, pos8.y,
            pos9.x, pos9.y,
            isStepCompleted(9) || isStepInActivePath(9),
            isStepActive(8) || isStepActive(9),
            isStepCompleted(9),
            8, 9
          )}
          {pos9 && pos10 && renderRail(
            pos9.x, pos9.y,
            pos10.x, pos10.y,
            isStepCompleted(10) || isStepInActivePath(10),
            isStepActive(9) || isStepActive(10),
            isStepCompleted(10),
            9, 10
          )}

          {/* Active step indicator */}
          {activeStep && (() => {
            const activePos = getPos(activeStep);
            if (!activePos) return null;
            return (
              <g>
                <circle
                  cx={activePos.x}
                  cy={activePos.y}
                  r="12"
                  fill="#8b5cf6"
                  opacity="0.6"
                >
                  <animate
                    attributeName="r"
                    values="10;14;10"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={activePos.x}
                  cy={activePos.y}
                  r="8"
                  fill="#a78bfa"
                  opacity="0.9"
                />
              </g>
            );
          })()}
        </svg>
      )}
    </div>
  );
}
