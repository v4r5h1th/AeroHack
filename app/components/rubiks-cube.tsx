"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type { Group } from "three"
import type { CubeState } from "../lib/cube-solver"

interface RubiksCubeProps {
  cubeState: CubeState
}

const COLORS = [
  "#ffffff", // White (Up)
  "#ff8c00", // Orange (Left)
  "#00ff00", // Green (Front)
  "#ff0000", // Red (Right)
  "#0000ff", // Blue (Back)
  "#ffff00", // Yellow (Down)
]

export function RubiksCube({ cubeState }: RubiksCubeProps) {
  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
    }
  })

  const renderCubelet = (x: number, y: number, z: number, faceColors: { [key: string]: number }) => {
    const position: [number, number, number] = [x * 1.1, y * 1.1, z * 1.1]

    return (
      <group key={`${x}-${y}-${z}`} position={position}>
        {/* Main cube geometry */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>

        {/* Front face sticker */}
        {faceColors.front !== undefined && (
          <mesh position={[0, 0, 0.501]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshLambertMaterial color={COLORS[faceColors.front]} />
          </mesh>
        )}

        {/* Back face sticker */}
        {faceColors.back !== undefined && (
          <mesh position={[0, 0, -0.501]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshLambertMaterial color={COLORS[faceColors.back]} />
          </mesh>
        )}

        {/* Right face sticker */}
        {faceColors.right !== undefined && (
          <mesh position={[0.501, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshLambertMaterial color={COLORS[faceColors.right]} />
          </mesh>
        )}

        {/* Left face sticker */}
        {faceColors.left !== undefined && (
          <mesh position={[-0.501, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshLambertMaterial color={COLORS[faceColors.left]} />
          </mesh>
        )}

        {/* Top face sticker */}
        {faceColors.top !== undefined && (
          <mesh position={[0, 0.501, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshLambertMaterial color={COLORS[faceColors.top]} />
          </mesh>
        )}

        {/* Bottom face sticker */}
        {faceColors.bottom !== undefined && (
          <mesh position={[0, -0.501, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.9, 0.9]} />
            <meshLambertMaterial color={COLORS[faceColors.bottom]} />
          </mesh>
        )}
      </group>
    )
  }

  const getCubeletColors = (x: number, y: number, z: number) => {
    const colors: { [key: string]: number } = {}

    // Map 3D position to face indices
    // Face mapping: 0=Up(White), 1=Left(Orange), 2=Front(Green), 3=Right(Red), 4=Back(Blue), 5=Down(Yellow)

    // Calculate the index in the face array based on position
    const getIndex = (row: number, col: number) => row * 3 + col

    // Top face (y = 1)
    if (y === 1) {
      const row = z + 1 // z: -1,0,1 -> row: 0,1,2
      const col = x + 1 // x: -1,0,1 -> col: 0,1,2
      colors.top = cubeState.faces[0][getIndex(row, col)]
    }

    // Bottom face (y = -1)
    if (y === -1) {
      const row = 2 - (z + 1) // z: -1,0,1 -> row: 2,1,0 (flipped)
      const col = x + 1 // x: -1,0,1 -> col: 0,1,2
      colors.bottom = cubeState.faces[5][getIndex(row, col)]
    }

    // Front face (z = 1)
    if (z === 1) {
      const row = 1 - y // y: -1,0,1 -> row: 2,1,0
      const col = x + 1 // x: -1,0,1 -> col: 0,1,2
      colors.front = cubeState.faces[2][getIndex(row, col)]
    }

    // Back face (z = -1)
    if (z === -1) {
      const row = 1 - y // y: -1,0,1 -> row: 2,1,0
      const col = 2 - (x + 1) // x: -1,0,1 -> col: 2,1,0 (flipped)
      colors.back = cubeState.faces[4][getIndex(row, col)]
    }

    // Right face (x = 1)
    if (x === 1) {
      const row = 1 - y // y: -1,0,1 -> row: 2,1,0
      const col = 2 - (z + 1) // z: -1,0,1 -> col: 2,1,0 (flipped)
      colors.right = cubeState.faces[3][getIndex(row, col)]
    }

    // Left face (x = -1)
    if (x === -1) {
      const row = 1 - y // y: -1,0,1 -> row: 2,1,0
      const col = z + 1 // z: -1,0,1 -> col: 0,1,2
      colors.left = cubeState.faces[1][getIndex(row, col)]
    }

    return colors
  }

  const cubelets = []

  // Generate all 27 cubelets (3x3x3)
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // Only render cubelets that are on the surface (at least one coordinate is ±1)
        if (Math.abs(x) === 1 || Math.abs(y) === 1 || Math.abs(z) === 1) {
          const colors = getCubeletColors(x, y, z)
          cubelets.push(renderCubelet(x, y, z, colors))
        }
      }
    }
  }

  return (
    <group ref={groupRef}>
      {cubelets}

      {/* Add some ambient lighting to the cube */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 2, 2]} intensity={0.8} />
    </group>
  )
}
