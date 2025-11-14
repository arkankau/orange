import { useState, useEffect } from "react";
import { MentalMapComparison } from "@/components/MentalMapComparison";
import { PerformanceSpider } from "@/components/PerformanceSpider";
import { QuestionCard } from "@/components/QuestionCard";
import { FeedbackDrawer } from "@/components/FeedbackDrawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, BarChart3, MessageSquare, Mic, MicOff, Loader2 } from "lucide-react";
import { analyzeQuestion, createSession } from "@/api/client";
import { QuestionResult } from "@/types/api";
import { buildHierarchicalTree } from "@/lib/mindmapUtils";
import { MentalMapNodeData } from "@/components/MentalMapNetwork";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: number;
  question: string;
  status: "pending" | "ready" | "reviewed";
  caseType?: string;
  result?: QuestionResult;
}

const Index = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      question: "What factors would you consider when evaluating whether our client should enter the Southeast Asian market?",
      status: "pending",
      caseType: "Market Entry",
    },
  ]);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [socket, setSocket] = useState<any>(null);
  const { toast } = useToast();

  // Initialize session and WebSocket on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await createSession(undefined, []);
        setSessionId(session.id);
        console.log("✅ Session created:", session.id);

        // Connect to WebSocket
        const { io } = await import("socket.io-client");
        const socketClient = io(`http://localhost:5001`, {
          transports: ["websocket"],
        });

        socketClient.on("connect", () => {
          console.log("✅ Connected to WebSocket");
          socketClient.emit("join-session", session.id);
        });

        socketClient.on("joined-session", (data) => {
          console.log("✅ Joined session:", data.sessionId);
        });

        socketClient.on("chunk-received", (data) => {
          console.log("📦 Chunk received:", data);
        });

        socketClient.on("processing-started", (data) => {
          console.log("⚙️ Processing started for question:", data.questionIndex);
          setIsAnalyzing(true);
        });

        socketClient.on("question-processed", (data) => {
          console.log("✅ Question processed:", data);
          setIsAnalyzing(false);
          
          // Convert the result to QuestionResult format
          if (data.result) {
            const result = data.result;
            // Call the orchestration endpoint to get full analysis (mental model + grading)
            analyzeAudioFromTranscript(result.transcript || "", result.bodyLanguage);
          }
        });

        socketClient.on("processing-error", (data) => {
          console.error("❌ Processing error:", data);
          setIsAnalyzing(false);
          toast({
            title: "Error",
            description: data.error || "Processing failed",
            variant: "destructive",
          });
        });

        setSocket(socketClient);

        // Initialize Web Speech API (will be started when recording begins)
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          const recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = true;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = "en-US";

          recognitionInstance.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
          };

          setRecognition(recognitionInstance);
        }

        return () => {
          socketClient.disconnect();
        };
      } catch (error) {
        console.error("Failed to create session:", error);
        console.warn("Session creation failed, will retry when needed");
      }
    };
    initSession();
  }, []);

  // Start recording with WebSocket streaming
  const startRecording = async () => {
    try {
      if (!sessionId) {
        toast({
          title: "Error",
          description: "Session not initialized",
          variant: "destructive",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];
      let currentChunkIndex = 0;
      let currentTranscript = ""; // Local variable to track transcript
      setChunkIndex(0);
      setLiveTranscript("");

      // Start Web Speech API
      if (recognition) {
        // Update local transcript variable when recognition updates
        const originalOnResult = recognition.onresult;
        recognition.onresult = (event: any) => {
          if (originalOnResult) originalOnResult(event);
          let finalTranscript = "";
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }
          currentTranscript = finalTranscript + interimTranscript;
          setLiveTranscript(currentTranscript);
        };
        
        recognition.start();
        console.log("🎤 Web Speech API started");
      }

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          
          // Send chunk via WebSocket endpoint
          const formData = new FormData();
          formData.append("audio", event.data, `chunk-${currentChunkIndex}.webm`);
          formData.append("questionIndex", (currentQuestionIndex || 1).toString());
          formData.append("chunkIndex", currentChunkIndex.toString());
          formData.append("timestamp", (Date.now() / 1000).toString());
          formData.append("isLast", "false");
          
          // Include current transcript if available
          if (currentTranscript) {
            formData.append("transcript", currentTranscript);
          }

          try {
            const response = await fetch(
              `http://localhost:5001/realtime/sessions/${sessionId}/chunk`,
              {
                method: "POST",
                body: formData,
              }
            );
            
            if (response.ok) {
              console.log(`📤 Sent audio chunk ${currentChunkIndex}`);
            } else {
              console.error(`Failed to send chunk ${currentChunkIndex}:`, await response.text());
            }
          } catch (error) {
            console.error(`Error sending chunk ${currentChunkIndex}:`, error);
          }

          currentChunkIndex++;
          setChunkIndex(currentChunkIndex);
        }
      };

      recorder.onstop = async () => {
        // Stop Web Speech API
        if (recognition) {
          recognition.stop();
        }

        // Use the local transcript variable
        console.log(`📝 Final transcript: ${currentTranscript || "(empty)"}`);

        // Send final chunk
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        setAudioChunks(chunks);
        console.log(`✅ Recording stopped, audio blob size: ${audioBlob.size} bytes`);
        
        if (audioBlob.size > 0) {
          const formData = new FormData();
          formData.append("audio", audioBlob, `chunk-final.webm`);
          formData.append("questionIndex", (currentQuestionIndex || 1).toString());
          formData.append("chunkIndex", currentChunkIndex.toString());
          formData.append("timestamp", (Date.now() / 1000).toString());
          formData.append("isLast", "true");
          
          // Include final transcript
          if (currentTranscript) {
            formData.append("transcript", currentTranscript);
          }

          try {
            const response = await fetch(
              `http://localhost:5001/realtime/sessions/${sessionId}/chunk`,
              {
                method: "POST",
                body: formData,
              }
            );
            
            if (response.ok) {
              console.log(`✅ Sent final chunk for question ${currentQuestionIndex || 1}, processing...`);
              setIsAnalyzing(true);
            } else {
              const errorText = await response.text();
              console.error("Failed to send final chunk:", errorText);
              toast({
                title: "Error",
                description: "Failed to process recording",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("Error sending final chunk:", error);
            toast({
              title: "Error",
              description: "Failed to send recording",
              variant: "destructive",
            });
          }
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording with timeslice to send chunks every 2 seconds
      recorder.start(2000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      console.log("🎤 Recording started with WebSocket streaming");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // Analyze audio from transcript (called after WebSocket processing)
  const analyzeAudioFromTranscript = async (transcript: string, bodyLanguage?: any) => {
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      // Create session if not exists
      try {
        const session = await createSession(undefined, []);
        currentSessionId = session.id;
        setSessionId(session.id);
      } catch (error) {
        console.error("Failed to create session:", error);
        toast({
          title: "Error",
          description: "Failed to create session",
          variant: "destructive",
        });
        return;
      }
    }

    setIsAnalyzing(true);
    try {
      // Use question index (1-based) for the API call
      const questionIndex = (questions[currentQuestionIndex]?.id || 1);
      console.log(`📤 Sending transcript for full analysis: sessionId=${currentSessionId}, questionIndex=${questionIndex}`);
      console.log(`   Transcript: "${transcript.substring(0, 100)}..."`);
      
      // Call the orchestration endpoint with the transcript
      const result = await analyzeQuestion({
        sessionId: currentSessionId,
        questionIndex,
        transcript,
        bodyLanguage,
      });

      console.log("✅ Analysis result received:", result);

      // Add or update question with result
      setQuestions((prev) => {
        const existingIndex = prev.findIndex(q => q.id === questionIndex);
        if (existingIndex >= 0) {
          // Update existing
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: "ready" as const,
            result,
            caseType: result.frameworkMatch.name,
          };
          return updated;
        } else {
          // Add new question
          return [
            ...prev,
            {
              id: questionIndex,
              question: `Question ${questionIndex}`,
              status: "ready" as const,
              result,
              caseType: result.frameworkMatch.name,
            },
          ];
        }
      });

      // Auto-select the analyzed question
      setSelectedQuestion(questionIndex);

      toast({
        title: "Analysis Complete",
        description: `Framework: ${result.frameworkMatch.name}`,
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuestionClick = (questionId: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (question?.result) {
      setSelectedQuestion(questionId);
      setDrawerOpen(true);
    }
  };

  // Get current question result for display
  const currentResult = questions.find((q) => q.id === selectedQuestion)?.result;
  
  // Convert mindmap trees to display format with error handling
  let userModel: MentalMapNodeData | null = null;
  let idealModel: MentalMapNodeData | null = null;
  
  if (currentResult?.mindmap) {
    try {
      if (currentResult.mindmap.your_model?.tree && Object.keys(currentResult.mindmap.your_model.tree).length > 0) {
        userModel = buildHierarchicalTree(currentResult.mindmap.your_model.tree);
        console.log("✅ Built user model:", userModel);
      }
      if (currentResult.mindmap.ideal_model?.tree && Object.keys(currentResult.mindmap.ideal_model.tree).length > 0) {
        idealModel = buildHierarchicalTree(currentResult.mindmap.ideal_model.tree);
        console.log("✅ Built ideal model:", idealModel);
      }
    } catch (error) {
      console.error("❌ Error building mindmap trees:", error);
    }
  }

  // Calculate performance metrics from grading
  const performanceMetrics = currentResult
    ? [
        { label: "Structure", value: currentResult.grading.structureScore / 20, maxValue: 5 },
        { label: "Insight", value: currentResult.grading.insightScore / 20, maxValue: 5 },
        { label: "Communication", value: currentResult.grading.communicationScore / 20, maxValue: 5 },
        { label: "Body Language", value: (currentResult.grading.bodyLanguageScore || 70) / 20, maxValue: 5 },
      ]
    : [
        { label: "Structure", value: 0, maxValue: 5 },
        { label: "Insight", value: 0, maxValue: 5 },
        { label: "Communication", value: 0, maxValue: 5 },
        { label: "Body Language", value: 0, maxValue: 5 },
      ];

  const avgScore = currentResult
    ? Math.round(
        (currentResult.grading.structureScore +
          currentResult.grading.insightScore +
          currentResult.grading.communicationScore +
          (currentResult.grading.bodyLanguageScore || 70)) /
          4
      )
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">orange</h1>
                <p className="text-sm text-muted-foreground">Your Personal Performance Lab</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {questions[currentQuestionIndex] && (
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isAnalyzing}
                  variant={isRecording ? "destructive" : "default"}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : isRecording ? (
                    <>
                      <MicOff className="h-4 w-4 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline">End Session</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="analysis" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="analysis" className="gap-2">
              <Brain className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-6">
            {userModel && idealModel ? (
              <MentalMapComparison
                userModel={userModel}
                idealModel={idealModel}
                questionNumber={selectedQuestion || 1}
              />
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  Record an answer to see your analysis
                </p>
              </Card>
            )}

            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-foreground mb-4">Session Statistics</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{questions.length}</div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">
                    {questions.filter((q) => q.status === "ready" || q.status === "reviewed").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Reviewed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-info">{avgScore}%</div>
                  <div className="text-sm text-muted-foreground">Avg Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">
                    {currentResult?.grading.communicationScore || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Communication</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Session Questions</h2>
              <Button variant="outline">Export All Feedback</Button>
            </div>
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                questionNumber={q.id}
                question={q.question}
                status={q.status}
                caseType={q.caseType}
                onClick={() => handleQuestionClick(q.id)}
              />
            ))}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceSpider
                metrics={performanceMetrics}
                title="Overall Communication Performance"
              />
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Key Improvement Areas
                </h3>
                <div className="space-y-4">
                  {currentResult?.grading.comments.map((comment, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-warning mt-2" />
                      <div>
                        <p className="text-sm text-muted-foreground">{comment}</p>
                      </div>
                    </div>
                  ))}
                  {!currentResult && (
                    <p className="text-sm text-muted-foreground">
                      Record an answer to see improvement suggestions
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Feedback Drawer */}
      {currentResult && (
        <FeedbackDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          questionNumber={selectedQuestion || 1}
          feedback={{
            userModel: Object.keys(currentResult.mindmap.your_model.tree),
            idealModel: Object.keys(currentResult.mindmap.ideal_model.tree),
            gaps: currentResult.mindmap.delta.missing,
            improvements: currentResult.grading.comments,
            quickFix: currentResult.mindmap.fix_summary,
          }}
        />
      )}
    </div>
  );
};

export default Index;
