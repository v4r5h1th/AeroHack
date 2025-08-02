"use client"

import { useState, useRef, useCallback } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Pause, RotateCcw, Shuffle, Zap, Brain, Sparkles, AlertCircle } from "lucide-react"
import { RubiksCube } from "./components/rubiks-cube"
import { type CubeState, solveCube, applyMove, isGoal, createSolvedCube, scrambleCube } from "./lib/cube-solver"

export default function RubiksCubeSolver() {
  const [cubeState, setCubeState] = useState<CubeState>(createSolvedCube())
  const [solution, setSolution] = useState<string[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSolving, setIsSolving] = useState(false)
  const [scrambleCount, setScrambleCount] = useState(10)
  const [solveStats, setSolveStats] = useState<{
    moves: number
    states: number
    time: number
  } | null>(null)
  const [manualMove, setManualMove] = useState("")
  const [aiEnabled, setAiEnabled] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout>()
  const goalCube = createSolvedCube()

  // Check if Gemini API key is available
  const hasGeminiKey = typeof window !== "undefined" && process.env.NEXT_PUBLIC_GEMINI_API_KEY

  const handleManualMove = useCallback(
    (move: string) => {
      const newState = applyMove(cubeState, move)
      setCubeState(newState)
      setSolution([])
      setCurrentMoveIndex(-1)
      setSolveStats(null)
    },
    [cubeState],
  )

  const handleManualMoveInput = useCallback(() => {
    const moves = manualMove.trim().split(/\s+/).filter(Boolean)
    const validMoves = ["U", "U'", "U2", "D", "D'", "D2", "R", "R'", "R2", "L", "L'", "L2"]

    let newState = cubeState
    for (const move of moves) {
      if (validMoves.includes(move)) {
        newState = applyMove(newState, move)
      }
    }

    setCubeState(newState)
    setManualMove("")
    setSolution([])
    setCurrentMoveIndex(-1)
    setSolveStats(null)
  }, [manualMove, cubeState])

  const handleScramble = useCallback(() => {
    const scrambled = scrambleCube(scrambleCount)
    setCubeState(scrambled.state)
    setSolution([])
    setCurrentMoveIndex(-1)
    setSolveStats(null)
  }, [scrambleCount])

  const handleReset = useCallback(() => {
    setCubeState(createSolvedCube())
    setSolution([])
    setCurrentMoveIndex(-1)
    setIsPlaying(false)
    setSolveStats(null)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  const handleSolve = useCallback(async () => {
    if (isGoal(cubeState, goalCube)) {
      return
    }

    setIsSolving(true)
    setSolveStats(null)

    try {
      const result = await solveCube(cubeState, goalCube)
      if (result.moves.length > 0) {
        setSolution(result.moves)
        setCurrentMoveIndex(-1)
        setSolveStats({
          moves: result.moves.length,
          states: result.statesExplored,
          time: result.timeMs,
        })
      }
    } catch (error) {
      console.error("Solving failed:", error)
    } finally {
      setIsSolving(false)
    }
  }, [cubeState, goalCube])

  const handlePlaySolution = useCallback(() => {
    if (solution.length === 0) return

    if (isPlaying) {
      setIsPlaying(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    setIsPlaying(true)
    let moveIndex = currentMoveIndex + 1

    intervalRef.current = setInterval(() => {
      if (moveIndex >= solution.length) {
        setIsPlaying(false)
        clearInterval(intervalRef.current!)
        return
      }

      const move = solution[moveIndex]
      setCubeState((prev) => applyMove(prev, move))
      setCurrentMoveIndex(moveIndex)
      moveIndex++
    }, 800)
  }, [solution, currentMoveIndex, isPlaying])

  const validMoves = ["U", "U'", "U2", "D", "D'", "D2", "R", "R'", "R2", "L", "L'", "L2"]
  const isSolved = isGoal(cubeState, goalCube)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AI-Enhanced Rubik's Cube Solver</h1>
          <p className="text-slate-300">A* algorithm with displaced pieces heuristic + Gemini AI enhancement</p>
        </div>

        {/* API Key Status */}
        {!hasGeminiKey && (
          <Alert className="mb-6 bg-amber-900/50 border-amber-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-amber-200">
              <strong>Gemini AI Enhancement Disabled:</strong> Add your GEMINI_API_KEY environment variable to enable
              AI-enhanced heuristics. The solver will use standard displaced pieces heuristic only.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 3D Cube Visualization */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  3D Cube Visualization
                  {isSolved && <Badge className="bg-green-500 text-white">SOLVED!</Badge>}
                  {hasGeminiKey && (
                    <Badge className="bg-purple-500 text-white flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Enhanced
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-slate-900/50 rounded-lg">
                  <Canvas camera={{ position: [4, 4, 4], fov: 50 }}>
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[10, 10, 5]} intensity={1} />
                    <RubiksCube cubeState={cubeState} />
                    <OrbitControls enablePan={false} />
                  </Canvas>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Manual Controls */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Manual Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Enter Moves</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={manualMove}
                      onChange={(e) => setManualMove(e.target.value)}
                      placeholder="e.g., U R' D2"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Button onClick={handleManualMoveInput} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Apply
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {validMoves.map((move) => (
                    <Button
                      key={move}
                      onClick={() => handleManualMove(move)}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      {move}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scramble Controls */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shuffle className="w-4 h-4" />
                  Scramble
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Number of moves</Label>
                  <Input
                    type="number"
                    value={scrambleCount}
                    onChange={(e) => setScrambleCount(Number.parseInt(e.target.value) || 10)}
                    min="1"
                    max="50"
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleScramble} className="flex-1 bg-orange-600 hover:bg-orange-700">
                    <Shuffle className="w-4 h-4 mr-2" />
                    Scramble
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Solver */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI-Enhanced Solver
                  {hasGeminiKey && <Sparkles className="w-4 h-4 text-purple-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-slate-300 bg-slate-700/50 rounded-lg p-3">
                  <div className="font-medium mb-1">Algorithm Details:</div>
                  <div>• A* search with displaced pieces heuristic</div>
                  {hasGeminiKey ? (
                    <div>• Gemini AI consulted every 15 heuristic calls</div>
                  ) : (
                    <div>• Standard heuristic only (no AI key)</div>
                  )}
                </div>

                <Button
                  onClick={handleSolve}
                  disabled={isSolving || isSolved}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
                >
                  {isSolving ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      {hasGeminiKey ? "Solving with AI..." : "Solving..."}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Solve Cube
                    </>
                  )}
                </Button>

                {solveStats && (
                  <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                    <div className="text-sm text-slate-300">
                      <div>Solution: {solveStats.moves} moves</div>
                      <div>States explored: {solveStats.states.toLocaleString()}</div>
                      <div>Time: {solveStats.time}ms</div>
                      {hasGeminiKey && (
                        <div className="text-purple-300">
                          🤖 AI consultations: ~{Math.floor(solveStats.states / 15)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Solution Display */}
        {solution.length > 0 && (
          <Card className="mt-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Solution ({solution.length} moves)</span>
                <Button onClick={handlePlaySolution} className="bg-purple-600 hover:bg-purple-700">
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play Solution
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPlaying && (
                <div className="mb-4">
                  <Progress value={((currentMoveIndex + 1) / solution.length) * 100} className="h-2" />
                  <div className="text-sm text-slate-300 mt-1">
                    Move {currentMoveIndex + 1} of {solution.length}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {solution.map((move, index) => (
                  <Badge
                    key={index}
                    variant={index <= currentMoveIndex ? "default" : "outline"}
                    className={`
                      ${
                        index <= currentMoveIndex
                          ? "bg-green-600 text-white"
                          : "bg-slate-700 text-slate-300 border-slate-600"
                      }
                      ${index === currentMoveIndex ? "ring-2 ring-green-400" : ""}
                    `}
                  >
                    {move}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
