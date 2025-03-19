
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Camera, StopCircle, Download, Loader2 } from "lucide-react";
import CameraControls from "@/components/CameraControls";
import RecordingIndicator from "@/components/RecordingIndicator";

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Request camera access when component mounts
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: true
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsCameraReady(true);
          setCameraPermission(true);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please check permissions.");
        setCameraPermission(false);
      }
    };

    setupCamera();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (!streamRef.current) return;

    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const videoURL = URL.createObjectURL(blob);
      setRecordedVideo(videoURL);
      setRecordedChunks(chunks);
      
      toast({
        title: "Recording completed",
        description: "Your video is ready to download",
      });
    };

    // Start the recorder
    mediaRecorder.start();
    setIsRecording(true);
    setElapsed(0);
    setRecordedVideo(null);

    // Start timer
    timerRef.current = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleDownload = () => {
    if (recordedChunks.length === 0) return;
    
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    toast({
      title: "Download started",
      description: "Your video is being downloaded",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <Card className="max-w-md w-full p-6 bg-gray-800 border-0">
          <div className="text-center space-y-4">
            <Camera className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold">Camera Access Error</h1>
            <p className="text-gray-300">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (cameraPermission === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <Card className="max-w-md w-full p-6 bg-gray-800 border-0">
          <div className="text-center space-y-4">
            <Camera className="mx-auto h-12 w-12 text-yellow-500" />
            <h1 className="text-xl font-bold">Camera Permission Required</h1>
            <p className="text-gray-300">
              This app needs access to your camera to record video. Please allow camera access in your browser settings and reload the page.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-center">Camera Recorder</h1>
        
        <Card className="relative overflow-hidden bg-black border-0 rounded-lg shadow-lg aspect-video">
          {!isCameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted={!isRecording}
            className={`w-full h-full object-cover ${!isCameraReady ? 'opacity-0' : 'opacity-100'}`}
          />
          
          {isRecording && <RecordingIndicator time={formatTime(elapsed)} />}
        </Card>
        
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4">
          <CameraControls
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
          
          {recordedVideo && !isRecording && (
            <Button 
              onClick={handleDownload}
              className="w-full md:w-auto flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Download Recording</span>
            </Button>
          )}
        </div>
        
        {recordedVideo && !isRecording && (
          <Card className="bg-gray-800 border-0 rounded-lg overflow-hidden">
            <div className="p-4">
              <h3 className="text-lg font-medium mb-2">Preview</h3>
              <video 
                src={recordedVideo} 
                controls 
                className="w-full rounded-md"
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
