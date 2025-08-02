import { GoogleGenerativeAI } from "@google/generative-ai"

export interface CubeState {
  faces: number[][]
}

export interface SolveResult {
  moves: string[]
  statesExplored: number
  timeMs: number
}

interface State {
  cube: CubeState
  gScore: number
  hScore: number
  fScore: number
  moves: string[]
}

let heuristicCallCount = 0
const aiHeuristicCache = new Map<string, number>()

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

export function createSolvedCube(): CubeState {
  const faces = []
  for (let i = 0; i < 6; i++) {
    faces.push(new Array(9).fill(i))
  }
  return { faces }
}

export function isGoal(current: CubeState, goal: CubeState): boolean {
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 9; j++) {
      if (current.faces[i][j] !== goal.faces[i][j]) {
        return false
      }
    }
  }
  return true
}

function getDisplacedPiecesHeuristic(current: CubeState, goal: CubeState): number {
  let displacedCount = 0

  for (let face = 0; face < 6; face++) {
    for (let sticker = 0; sticker < 9; sticker++) {
      if (current.faces[face][sticker] !== goal.faces[face][sticker]) {
        displacedCount++
      }
    }
  }

  return Math.ceil(displacedCount / 8)
}

function formatCubeStateForAI(cube: CubeState): string {
  const faceNames = ["Up(White)", "Left(Orange)", "Front(Green)", "Right(Red)", "Back(Blue)", "Down(Yellow)"]
  const colorNames = ["W", "O", "G", "R", "B", "Y"]

  let formatted = "Rubik's Cube State:\n"

  for (let i = 0; i < 6; i++) {
    formatted += `${faceNames[i]}: `
    for (let j = 0; j < 9; j++) {
      formatted += colorNames[cube.faces[i][j]]
      if ((j + 1) % 3 === 0) formatted += " "
    }
    formatted += "\n"
  }

  return formatted
}

async function getAIEnhancedHeuristic(current: CubeState, goal: CubeState): Promise<number> {
  if (!genAI) {
    return getDisplacedPiecesHeuristic(current, goal)
  }

  const stateKey = hashCubeState(current)

  if (aiHeuristicCache.has(stateKey)) {
    return aiHeuristicCache.get(stateKey)!
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const prompt = `
You are an expert Rubik's cube solver AI. Analyze this cube state and provide a heuristic estimate.

${formatCubeStateForAI(current)}

SOLVED STATE (goal):
Up(White): W W W 
Left(Orange): O O O 
Front(Green): G G G 
Right(Red): R R R 
Back(Blue): B B B 
Down(Yellow): Y Y Y 

Please analyze:
1. How many pieces are displaced from their correct positions?
2. How many moves do you estimate it would take to solve this cube?
3. Consider piece relationships and cube solving patterns.

Respond with ONLY a single number representing your best estimate of moves needed to solve this cube state. Be conservative - it's better to slightly underestimate than overestimate.
`

    const result = await model.generateContent(prompt)
    const response = result.response.text().trim()

    const aiEstimate = Number.parseInt(response.match(/\d+/)?.[0] || "0")

    if (aiEstimate > 0 && aiEstimate < 50) {
      aiHeuristicCache.set(stateKey, aiEstimate)
      return aiEstimate
    }
  } catch (error) {
    console.warn("AI heuristic failed, falling back to standard:", error)
  }

  return getDisplacedPiecesHeuristic(current, goal)
}

async function getSmartHeuristic(current: CubeState, goal: CubeState): Promise<number> {
  heuristicCallCount++

  if (heuristicCallCount % 15 === 0 && genAI) {
    console.log(`🤖 Consulting AI for heuristic evaluation (call #${heuristicCallCount})...`)
    return await getAIEnhancedHeuristic(current, goal)
  }

  return getDisplacedPiecesHeuristic(current, goal)
}

function applyPermutation(face: number[], perm: number[]): number[] {
  const temp = [...face]
  for (let i = 0; i < perm.length; i++) {
    face[i] = temp[perm[i]]
  }
  return face
}

export function applyMove(cube: CubeState, move: string): CubeState {
  const newCube: CubeState = {
    faces: cube.faces.map((face) => [...face]),
  }

  const facePermutation = [6, 3, 0, 7, 4, 1, 8, 5, 2]
  const facePermutationPrime = [2, 5, 8, 1, 4, 7, 0, 3, 6]
  const facePermutation2 = [8, 7, 6, 5, 4, 3, 2, 1, 0]

  switch (move) {
    case "U":
      applyPermutation(newCube.faces[0], facePermutation)
      {
        const temp = [newCube.faces[1][0], newCube.faces[1][1], newCube.faces[1][2]]
        newCube.faces[1][0] = newCube.faces[2][0]
        newCube.faces[1][1] = newCube.faces[2][1]
        newCube.faces[1][2] = newCube.faces[2][2]
        newCube.faces[2][0] = newCube.faces[3][0]
        newCube.faces[2][1] = newCube.faces[3][1]
        newCube.faces[2][2] = newCube.faces[3][2]
        newCube.faces[3][0] = newCube.faces[4][0]
        newCube.faces[3][1] = newCube.faces[4][1]
        newCube.faces[3][2] = newCube.faces[4][2]
        newCube.faces[4][0] = temp[0]
        newCube.faces[4][1] = temp[1]
        newCube.faces[4][2] = temp[2]
      }
      break
    case "U'":
      applyPermutation(newCube.faces[0], facePermutationPrime)
      {
        const temp = [newCube.faces[1][0], newCube.faces[1][1], newCube.faces[1][2]]
        newCube.faces[1][0] = newCube.faces[4][0]
        newCube.faces[1][1] = newCube.faces[4][1]
        newCube.faces[1][2] = newCube.faces[4][2]
        newCube.faces[4][0] = newCube.faces[3][0]
        newCube.faces[4][1] = newCube.faces[3][1]
        newCube.faces[4][2] = newCube.faces[3][2]
        newCube.faces[3][0] = newCube.faces[2][0]
        newCube.faces[3][1] = newCube.faces[2][1]
        newCube.faces[3][2] = newCube.faces[2][2]
        newCube.faces[2][0] = temp[0]
        newCube.faces[2][1] = temp[1]
        newCube.faces[2][2] = temp[2]
      }
      break
    case "U2":
      applyPermutation(newCube.faces[0], facePermutation2)
      {
        const temp = [newCube.faces[1][0], newCube.faces[1][1], newCube.faces[1][2]]
        newCube.faces[1][0] = newCube.faces[3][0]
        newCube.faces[1][1] = newCube.faces[3][1]
        newCube.faces[1][2] = newCube.faces[3][2]
        newCube.faces[3][0] = temp[0]
        newCube.faces[3][1] = temp[1]
        newCube.faces[3][2] = temp[2]
        const temp2 = [newCube.faces[2][0], newCube.faces[2][1], newCube.faces[2][2]]
        newCube.faces[2][0] = newCube.faces[4][0]
        newCube.faces[2][1] = newCube.faces[4][1]
        newCube.faces[2][2] = newCube.faces[4][2]
        newCube.faces[4][0] = temp2[0]
        newCube.faces[4][1] = temp2[1]
        newCube.faces[4][2] = temp2[2]
      }
      break
    case "D":
      applyPermutation(newCube.faces[5], facePermutation)
      {
        const temp = [newCube.faces[1][6], newCube.faces[1][7], newCube.faces[1][8]]
        newCube.faces[1][6] = newCube.faces[4][6]
        newCube.faces[1][7] = newCube.faces[4][7]
        newCube.faces[1][8] = newCube.faces[4][8]
        newCube.faces[4][6] = newCube.faces[3][6]
        newCube.faces[4][7] = newCube.faces[3][7]
        newCube.faces[4][8] = newCube.faces[3][8]
        newCube.faces[3][6] = newCube.faces[2][6]
        newCube.faces[3][7] = newCube.faces[2][7]
        newCube.faces[3][8] = newCube.faces[2][8]
        newCube.faces[2][6] = temp[0]
        newCube.faces[2][7] = temp[1]
        newCube.faces[2][8] = temp[2]
      }
      break
    case "D'":
      applyPermutation(newCube.faces[5], facePermutationPrime)
      {
        const temp = [newCube.faces[1][6], newCube.faces[1][7], newCube.faces[1][8]]
        newCube.faces[1][6] = newCube.faces[2][6]
        newCube.faces[1][7] = newCube.faces[2][7]
        newCube.faces[1][8] = newCube.faces[2][8]
        newCube.faces[2][6] = newCube.faces[3][6]
        newCube.faces[2][7] = newCube.faces[3][7]
        newCube.faces[2][8] = newCube.faces[3][8]
        newCube.faces[3][6] = newCube.faces[4][6]
        newCube.faces[3][7] = newCube.faces[4][7]
        newCube.faces[3][8] = newCube.faces[4][8]
        newCube.faces[4][6] = temp[0]
        newCube.faces[4][7] = temp[1]
        newCube.faces[4][8] = temp[2]
      }
      break
    case "D2":
      applyPermutation(newCube.faces[5], facePermutation2)
      {
        const temp = [newCube.faces[1][6], newCube.faces[1][7], newCube.faces[1][8]]
        newCube.faces[1][6] = newCube.faces[3][6]
        newCube.faces[1][7] = newCube.faces[3][7]
        newCube.faces[1][8] = newCube.faces[3][8]
        newCube.faces[3][6] = temp[0]
        newCube.faces[3][7] = temp[1]
        newCube.faces[3][8] = temp[2]
        const temp2 = [newCube.faces[2][6], newCube.faces[2][7], newCube.faces[2][8]]
        newCube.faces[2][6] = newCube.faces[4][6]
        newCube.faces[2][7] = newCube.faces[4][7]
        newCube.faces[2][8] = newCube.faces[4][8]
        newCube.faces[4][6] = temp2[0]
        newCube.faces[4][7] = temp2[1]
        newCube.faces[4][8] = temp2[2]
      }
      break
    case "R":
      applyPermutation(newCube.faces[3], facePermutation)
      {
        const temp = [newCube.faces[0][2], newCube.faces[0][5], newCube.faces[0][8]]
        newCube.faces[0][2] = newCube.faces[2][2]
        newCube.faces[0][5] = newCube.faces[2][5]
        newCube.faces[0][8] = newCube.faces[2][8]
        newCube.faces[2][2] = newCube.faces[5][2]
        newCube.faces[2][5] = newCube.faces[5][5]
        newCube.faces[2][8] = newCube.faces[5][8]
        newCube.faces[5][2] = newCube.faces[4][6]
        newCube.faces[5][5] = newCube.faces[4][3]
        newCube.faces[5][8] = newCube.faces[4][0]
        newCube.faces[4][6] = temp[0]
        newCube.faces[4][3] = temp[1]
        newCube.faces[4][0] = temp[2]
      }
      break
    case "R'":
      applyPermutation(newCube.faces[3], facePermutationPrime)
      {
        const temp = [newCube.faces[0][2], newCube.faces[0][5], newCube.faces[0][8]]
        newCube.faces[0][2] = newCube.faces[4][6]
        newCube.faces[0][5] = newCube.faces[4][3]
        newCube.faces[0][8] = newCube.faces[4][0]
        newCube.faces[4][6] = newCube.faces[5][2]
        newCube.faces[4][3] = newCube.faces[5][5]
        newCube.faces[4][0] = newCube.faces[5][8]
        newCube.faces[5][2] = newCube.faces[2][2]
        newCube.faces[5][5] = newCube.faces[2][5]
        newCube.faces[5][8] = newCube.faces[2][8]
        newCube.faces[2][2] = temp[0]
        newCube.faces[2][5] = temp[1]
        newCube.faces[2][8] = temp[2]
      }
      break
    case "R2":
      applyPermutation(newCube.faces[3], facePermutation2)
      {
        const temp = [newCube.faces[0][2], newCube.faces[0][5], newCube.faces[0][8]]
        newCube.faces[0][2] = newCube.faces[5][2]
        newCube.faces[0][5] = newCube.faces[5][5]
        newCube.faces[0][8] = newCube.faces[5][8]
        newCube.faces[5][2] = temp[0]
        newCube.faces[5][5] = temp[1]
        newCube.faces[5][8] = temp[2]
        const temp2 = [newCube.faces[2][2], newCube.faces[2][5], newCube.faces[2][8]]
        newCube.faces[2][2] = newCube.faces[4][6]
        newCube.faces[2][5] = newCube.faces[4][3]
        newCube.faces[2][8] = newCube.faces[4][0]
        newCube.faces[4][6] = temp2[0]
        newCube.faces[4][3] = temp2[1]
        newCube.faces[4][0] = temp2[2]
      }
      break
    case "L":
      applyPermutation(newCube.faces[1], facePermutation)
      {
        const temp = [newCube.faces[0][0], newCube.faces[0][3], newCube.faces[0][6]]
        newCube.faces[0][0] = newCube.faces[4][8]
        newCube.faces[0][3] = newCube.faces[4][5]
        newCube.faces[0][6] = newCube.faces[4][2]
        newCube.faces[4][8] = newCube.faces[5][0]
        newCube.faces[4][5] = newCube.faces[5][3]
        newCube.faces[4][2] = newCube.faces[5][6]
        newCube.faces[5][0] = newCube.faces[2][0]
        newCube.faces[5][3] = newCube.faces[2][3]
        newCube.faces[5][6] = newCube.faces[2][6]
        newCube.faces[2][0] = temp[0]
        newCube.faces[2][3] = temp[1]
        newCube.faces[2][6] = temp[2]
      }
      break
    case "L'":
      applyPermutation(newCube.faces[1], facePermutationPrime)
      {
        const temp = [newCube.faces[0][0], newCube.faces[0][3], newCube.faces[0][6]]
        newCube.faces[0][0] = newCube.faces[2][0]
        newCube.faces[0][3] = newCube.faces[2][3]
        newCube.faces[0][6] = newCube.faces[2][6]
        newCube.faces[2][0] = newCube.faces[5][0]
        newCube.faces[2][3] = newCube.faces[5][3]
        newCube.faces[2][6] = newCube.faces[5][6]
        newCube.faces[5][0] = newCube.faces[4][8]
        newCube.faces[5][3] = newCube.faces[4][5]
        newCube.faces[5][6] = newCube.faces[4][2]
        newCube.faces[4][8] = temp[0]
        newCube.faces[4][5] = temp[1]
        newCube.faces[4][2] = temp[2]
      }
      break
    case "L2":
      applyPermutation(newCube.faces[1], facePermutation2)
      {
        const temp = [newCube.faces[0][0], newCube.faces[0][3], newCube.faces[0][6]]
        newCube.faces[0][0] = newCube.faces[5][0]
        newCube.faces[0][3] = newCube.faces[5][3]
        newCube.faces[0][6] = newCube.faces[5][6]
        newCube.faces[5][0] = temp[0]
        newCube.faces[5][3] = temp[1]
        newCube.faces[5][6] = temp[2]
        const temp2 = [newCube.faces[2][0], newCube.faces[2][3], newCube.faces[2][6]]
        newCube.faces[2][0] = newCube.faces[4][8]
        newCube.faces[2][3] = newCube.faces[4][5]
        newCube.faces[2][6] = newCube.faces[4][2]
        newCube.faces[4][8] = temp2[0]
        newCube.faces[4][5] = temp2[1]
        newCube.faces[4][2] = temp2[2]
      }
      break
  }

  return newCube
}

export function scrambleCube(moves: number): { state: CubeState; moves: string[] } {
  const validMoves = ["U", "U'", "U2", "D", "D'", "D2", "R", "R'", "R2", "L", "L'", "L2"]
  let state = createSolvedCube()
  const appliedMoves: string[] = []

  for (let i = 0; i < moves; i++) {
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)]
    state = applyMove(state, randomMove)
    appliedMoves.push(randomMove)
  }

  return { state, moves: appliedMoves }
}

function hashCubeState(cube: CubeState): string {
  return cube.faces.map((face) => face.join("")).join("|")
}

export async function solveCube(scrambledCube: CubeState, goalCube: CubeState): Promise<SolveResult> {
  return new Promise(async (resolve) => {
    const startTime = Date.now()
    heuristicCallCount = 0 
    aiHeuristicCache.clear() 

    const openSet: State[] = []
    const visited = new Set<string>()

    const initialState: State = {
      cube: scrambledCube,
      gScore: 0,
      hScore: await getSmartHeuristic(scrambledCube, goalCube),
      fScore: 0,
      moves: [],
    }
    initialState.fScore = initialState.gScore + initialState.hScore

    openSet.push(initialState)

    const validMoves = ["U", "U'", "U2", "D", "D'", "D2", "R", "R'", "R2", "L", "L'", "L2"]

    const processNextState = async () => {
      if (openSet.length === 0) {
        resolve({ moves: [], statesExplored: visited.size, timeMs: Date.now() - startTime })
        return
      }

      openSet.sort((a, b) => a.fScore - b.fScore)
      const currentState = openSet.shift()!

      const currentHash = hashCubeState(currentState.cube)
      if (visited.has(currentHash)) {
        setTimeout(processNextState, 0)
        return
      }

      visited.add(currentHash)

      if (isGoal(currentState.cube, goalCube)) {
        console.log(`🎉 Solution found! AI consulted ${Math.floor(heuristicCallCount / 15)} times`)
        resolve({
          moves: currentState.moves,
          statesExplored: visited.size,
          timeMs: Date.now() - startTime,
        })
        return
      }

      for (const move of validMoves) {
        const neighborCube = applyMove(currentState.cube, move)
        const neighborHash = hashCubeState(neighborCube)

        if (!visited.has(neighborHash)) {
          const neighborState: State = {
            cube: neighborCube,
            gScore: currentState.gScore + 1,
            hScore: await getSmartHeuristic(neighborCube, goalCube),
            fScore: 0,
            moves: [...currentState.moves, move],
          }
          neighborState.fScore = neighborState.gScore + neighborState.hScore

          openSet.push(neighborState)
        }
      }

      setTimeout(processNextState, 0)
    }

    processNextState()
  })
}
