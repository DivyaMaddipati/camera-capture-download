
import React from "react";

interface RecordingIndicatorProps {
  time: string;
  fileSize?: string;
}

const RecordingIndicator = ({ time, fileSize }: RecordingIndicatorProps) => {
  return (
    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/70 px-3 py-1 rounded-full">
      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse-record"></div>
      <span className="text-sm font-medium">{time}</span>
      {fileSize && (
        <span className="text-xs text-gray-300">({fileSize})</span>
      )}
    </div>
  );
};

export default RecordingIndicator;
