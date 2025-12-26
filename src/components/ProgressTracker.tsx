import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Brain, BookCheck, Target, TrendingUp, Award } from 'lucide-react';

interface Progress {
  guidesRead: number;
  totalGuides: number;
  questionsAsked: number;
  imagesGenerated: number;
  hoursLearned: number;
  streak: number;
}

const ProgressTracker: React.FC = () => {
  const [progress, setProgress] = useState<Progress>({
    guidesRead: 0,
    totalGuides: 259,
    questionsAsked: 0,
    imagesGenerated: 0,
    hoursLearned: 0,
    streak: 0,
  });

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const data = await invoke<Progress>('get_progress');
      setProgress(data);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const stats = [
    {
      icon: BookCheck,
      label: 'Guides Read',
      value: progress.guidesRead,
      total: progress.totalGuides,
      color: 'blue',
      showProgress: true,
    },
    {
      icon: Brain,
      label: 'Questions Asked',
      value: progress.questionsAsked,
      color: 'green',
      showProgress: false,
    },
    {
      icon: Target,
      label: 'Visuals Created',
      value: progress.imagesGenerated,
      color: 'purple',
      showProgress: false,
    },
    {
      icon: TrendingUp,
      label: 'Hours Learned',
      value: progress.hoursLearned.toFixed(1),
      color: 'yellow',
      showProgress: false,
    },
    {
      icon: Award,
      label: 'Day Streak',
      value: progress.streak,
      color: 'pink',
      showProgress: false,
    },
  ];

  const completionPercent = Math.round((progress.guidesRead / progress.totalGuides) * 100);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-pink-500/20 p-2 rounded-lg">
            <Brain className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Your Progress</h2>
            <p className="text-xs text-muted-foreground">Track your learning journey</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Overall Progress */}
        <div className="bg-background border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Overall Progress</h3>
            <span className="text-2xl font-bold text-primary">{completionPercent}%</span>
          </div>
          <div className="w-full bg-card rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-purple-500 h-full rounded-full
                transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {progress.guidesRead} of {progress.totalGuides} guides completed
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-background border border-border rounded-lg p-6
                  hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`bg-${stat.color}-500/20 p-2 rounded-lg`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                  </div>
                  <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {stat.showProgress && stat.total && (
                  <div className="mt-3">
                    <div className="w-full bg-card rounded-full h-2">
                      <div
                        className={`bg-${stat.color}-500 h-full rounded-full transition-all`}
                        style={{
                          width: `${(Number(stat.value) / stat.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Achievements */}
        <div className="bg-background border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Achievements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'First Steps', unlocked: progress.guidesRead > 0 },
              { name: 'Curious Mind', unlocked: progress.questionsAsked >= 10 },
              { name: 'Visual Learner', unlocked: progress.imagesGenerated >= 5 },
              { name: 'Dedicated', unlocked: progress.streak >= 7 },
            ].map((achievement, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg text-center ${
                  achievement.unlocked
                    ? 'bg-yellow-500/20 border border-yellow-500/30'
                    : 'bg-card border border-border opacity-50'
                }`}
              >
                <Award
                  className={`w-8 h-8 mx-auto mb-2 ${
                    achievement.unlocked ? 'text-yellow-400' : 'text-muted-foreground'
                  }`}
                />
                <p className="text-xs font-medium text-foreground">{achievement.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Message */}
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-blue-500/30
          rounded-lg p-6">
          <p className="text-foreground mb-2">
            {progress.guidesRead === 0
              ? "🚀 Start your learning journey today!"
              : progress.guidesRead < 10
              ? "🎯 Great start! Keep exploring!"
              : progress.guidesRead < 50
              ? "🔥 You're on fire! Keep it up!"
              : progress.guidesRead < 100
              ? "⭐ Amazing progress! You're crushing it!"
              : "🏆 Incredible! You're a knowledge master!"}
          </p>
          <p className="text-sm text-muted-foreground">
            {259 - progress.guidesRead} more guides to explore
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
