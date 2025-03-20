
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Camera, StopCircle, Download, Loader2, Mic, MicOff } from "lucide-react";
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
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const { toast } = useToast();

  // Constants for recording settings
  const MIME_TYPE = 'video/webm';
  const VIDEO_BITRATE = 2500000; // 2.5 Mbps
  const AUDIO_BITRATE = 128000; // 128 kbps
  const TIMESLICE = 1000; // Save data every 1 second

  useEffect(() => {
    // Request camera access when component mounts
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: isAudioEnabled
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
  }, [isAudioEnabled]);

  const toggleAudio = async () => {
    if (isRecording) return; // Don't toggle during recording
    
    setIsAudioEnabled(!isAudioEnabled);
    
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Will trigger the useEffect to re-setup camera with new audio setting
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    // Reset any previous recording data
    chunksRef.current = [];
    setEstimatedSize(0);
    setRecordingStartTime(Date.now());
    
    // Set up media recorder with optimized settings for longer recordings
    const options = {
      mimeType: MIME_TYPE,
      videoBitsPerSecond: VIDEO_BITRATE,
      audioBitsPerSecond: isAudioEnabled ? AUDIO_BITRATE : undefined
    };
    
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Update estimated size (in MB)
          const currentSize = chunksRef.current.reduce((total, chunk) => total + chunk.size, 0) / (1024 * 1024);
          setEstimatedSize(currentSize);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: MIME_TYPE });
        const videoURL = URL.createObjectURL(blob);
        setRecordedVideo(videoURL);
        setRecordedChunks(chunksRef.current);
        
        toast({
          title: "Recording completed",
          description: `Your ${Math.round(estimatedSize * 10) / 10} MB video is ready to download`,
        });
      };

      // Start the recorder with timeslice to process data in chunks
      mediaRecorder.start(TIMESLICE);
      setIsRecording(true);
      setElapsed(0);
      setRecordedVideo(null);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({
        title: "Recording error",
        description: "Could not start recording. Your browser might not support the required codecs.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStartTime(null);
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleDownload = () => {
    if (recordedChunks.length === 0) return;
    
    const blob = new Blob(recordedChunks, { type: MIME_TYPE });
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
      description: `Downloading ${Math.round(estimatedSize * 10) / 10} MB video file`,
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
          
          {isRecording && (
            <RecordingIndicator 
              time={formatTime(elapsed)} 
              fileSize={estimatedSize > 0 ? `${Math.round(estimatedSize * 10) / 10} MB` : undefined}
            />
          )}
        </Card>
        
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4">
          <Button
            onClick={toggleAudio}
            variant="outline"
            className="w-full md:w-auto flex items-center space-x-2"
            disabled={isRecording}
          >
            {isAudioEnabled ? (
              <>
                <Mic className="h-4 w-4" />
                <span>Audio: On</span>
              </>
            ) : (
              <>
                <MicOff className="h-4 w-4" />
                <span>Audio: Off</span>
              </>
            )}
          </Button>
          
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
