import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Zap } from 'lucide-react';

const HyperfocusTimer: React.FC = () => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const focusTime = 25 * 60;
  const breakTime = 5 * 60;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer finished
            handleTimerComplete();
            return mode === 'focus' ? breakTime : focusTime;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode]);

  const handleTimerComplete = () => {
    // Play notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi...');
    audio.play();

    if (mode === 'focus') {
      setSessions((prev) => prev + 1);
      setMode('break');
      setIsRunning(false);
    } else {
      setMode('focus');
      setIsRunning(false);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? focusTime : breakTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = mode === 'focus'
    ? ((focusTime - timeLeft) / focusTime) * 100
    : ((breakTime - timeLeft) / breakTime) * 100;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 p-2 rounded-lg">
            <Timer className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Hyperfocus Timer</h2>
            <p className="text-xs text-muted-foreground">ADHD-optimized Pomodoro technique</p>
          </div>
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          {/* Mode Indicator */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 ${
            mode === 'focus'
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {mode === 'focus' ? (
              <>
                <Brain className="w-5 h-5" />
                <span className="font-medium">Focus Time</span>
              </>
            ) : (
              <>
                <Coffee className="w-5 h-5" />
                <span className="font-medium">Break Time</span>
              </>
            )}
          </div>

          {/* Circular Progress */}
          <div className="relative mb-8">
            <svg className="w-64 h-64 mx-auto transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-foreground"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progressPercent / 100)}`}
                className={mode === 'focus' ? 'text-orange-500' : 'text-green-500'}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-foreground mb-2">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isRunning ? (mode === 'focus' ? 'Stay focused!' : 'Relax & recharge') : 'Ready to start?'}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={toggleTimer}
              className={`p-4 rounded-full transition-all ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              } text-white shadow-lg`}
            >
              {isRunning ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
            </button>
            <button
              onClick={resetTimer}
              className="p-4 rounded-full bg-muted hover:bg-muted/60 text-foreground
                transition-colors shadow-lg"
            >
              <RotateCcw className="w-8 h-8" />
            </button>
          </div>

          {/* Sessions Completed */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-center justify-center gap-3">
              <Zap className="w-6 h-6 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-foreground">{sessions}</div>
                <div className="text-sm text-muted-foreground">Sessions Completed Today</div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 text-left bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="font-medium text-primary mb-2">💡 ADHD Hyperfocus Tips:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Close all unnecessary tabs and apps</li>
              <li>• Put phone in another room</li>
              <li>• Use noise-cancelling headphones</li>
              <li>• Have water and snacks nearby</li>
              <li>• Set a clear goal before starting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HyperfocusTimer;
