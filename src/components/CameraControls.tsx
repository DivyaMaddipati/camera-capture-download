
import React from "react";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle } from "lucide-react";

interface CameraControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const CameraControls = ({
  isRecording,
  onStartRecording,
  onStopRecording,
}: CameraControlsProps) => {
  return (
    <div className="flex items-center justify-center">
      {!isRecording ? (
        <Button
          onClick={onStartRecording}
          className="w-full md:w-auto flex items-center space-x-2 bg-record hover:bg-record-hover"
          size="lg"
        >
          <Camera className="h-5 w-5" />
          <span>Start Recording</span>
        </Button>
      ) : (
        <Button
          onClick={onStopRecording}
          variant="outline"
          className="w-full md:w-auto flex items-center space-x-2 border-red-500 text-red-500 hover:bg-red-500/10"
          size="lg"
        >
          <StopCircle className="h-5 w-5" />
          <span>Stop Recording</span>
        </Button>
      )}
    </div>
  );
};

export default CameraControls;
