import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, BookOpen, Brain, Search, Upload, Zap, Check, ArrowRight, Star, GraduationCap, TrendingUp, Heart, ChevronDown, ChevronUp, MessageSquare, Layout, Palette, Save, FileCode } from 'lucide-react';
import HeroBackground from './HeroBackground';
import thinkspaceLogo from '../assets/thinkspace-logo.png';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [showPaidPlans, setShowPaidPlans] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const features = [
    {
      icon: MessageSquare,
      title: 'Advanced AI Chat',
      description: 'Chat with powerful models like Grok & Minimax for deep insights',
    },
    {
      icon: Layout,
      title: 'Dojo Canvas',
      description: 'An infinite whiteboard for your thoughts, ideas, and study notes',
    },
    {
      icon: BookOpen,
      title: 'AI Study Guides',
      description: 'Generate comprehensive study materials from any topic instantly',
    },
    {
      icon: Upload,
      title: 'Smart Knowledge',
      description: 'Upload documents and transform them into searchable knowledge',
    },
    {
      icon: Search,
      title: 'Semantic Search',
      description: 'Find exactly what you need with AI-powered contextual search',
    },
    {
      icon: Palette,
      title: 'Beautiful Themes',
      description: 'Personalize your workspace with 6+ stunning color themes',
    },
    {
      icon: Save,
      title: 'Session Saving',
      description: 'Save your progress and resume your study sessions anytime',
    },
    {
      icon: FileCode,
      title: 'Markdown Support',
      description: 'Write and format your notes with full Markdown support',
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out ThinkSpace',
      features: [
        '1 Canvas',
        '15 study guides / month',
        '150 AI chats / month',
        'Basic themes'
      ],
      cta: 'Get Started Free',
      popular: false,
      color: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'border-blue-500/30',
      detailedLimits: [
        '150 AI chats / month',
        '15 study guides / month',
        '30 AI images / month',
        '5 file embeddings'
      ]
    },
    {
      name: 'Pro',
      price: '$9',
      period: 'month',
      description: 'For serious learners and students',
      features: [
        'Dual Canvases',
        '50 study guides / month',
        '1000 AI chats / month',
        'All themes',
        'Session saving',
        'Visual learning'
      ],
      cta: 'Coming Soon',
      popular: true,
      color: 'from-primary/20 to-accent/20',
      borderColor: 'border-primary/50',
      detailedLimits: [
        '1000 AI chats / month',
        '50 study guides / month',
        '100 AI images / month',
        '25 file embeddings'
      ]
    },
    {
      name: 'Group Add-On',
      price: '$20',
      period: 'month',
      description: 'Collaborate with your peers',
      features: [
        'Create and manage groups',
        'Unlimited shared canvases',
        'Shared knowledge base',
        'Unlimited group chat',
        'Group sessions'
      ],
      cta: 'Coming Soon',
      popular: false,
      color: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-500/30',
      detailedLimits: [
        'Unlimited group chats',
        'Unlimited shared canvases',
        'Up to 5 members / group'
      ]
    }
  ];

  const testimonials = [
    {
      name: 'Arrow',
      role: 'Early Tester',
      avatar: null,
      quote: 'Bro release this app... What is this? You\'re cooking. Damn. You should apply for YC You\'ll get selected!',
      rating: 5
    }
  ];

  // Check if running in Tauri (desktop app)
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

  const downloadLinks = {
    student: {
      windows: import.meta.env.VITE_DOWNLOAD_STUDENT_WINDOWS_URL || '',
      mac: import.meta.env.VITE_DOWNLOAD_STUDENT_MAC_URL || '',
      linux: import.meta.env.VITE_DOWNLOAD_STUDENT_LINUX_URL || '',
    },
    developer: {
      windows: import.meta.env.VITE_DOWNLOAD_DEVELOPER_WINDOWS_URL || '',
      mac: import.meta.env.VITE_DOWNLOAD_DEVELOPER_MAC_URL || '',
      linux: import.meta.env.VITE_DOWNLOAD_DEVELOPER_LINUX_URL || '',
    },
  };

  const hasAnyDownload =
    Object.values(downloadLinks.student).some(Boolean) ||
    Object.values(downloadLinks.developer).some(Boolean);

  const scrollToDownloads = () => {
    document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const privacyHref = `${import.meta.env.BASE_URL}privacy.html`;

  const faqs = [
    {
      question: 'What makes ThinkSpace different from other study apps?',
      answer: 'ThinkSpace combines AI-powered content generation, visual learning, and productivity tools in one beautiful interface. Our hyperfocus timer is specifically designed for ADHD learners, and our semantic search understands context, not just keywords.'
    },
    {
      question: 'Can I use ThinkSpace if I have ADHD?',
      answer: 'Absolutely! ThinkSpace was designed with neurodivergent learners in mind. Features like our hyperfocus timer, color-coded themes, and visual learning aids help maintain engagement and reduce overwhelm.'
    },
    {
      question: 'What file types can I embed?',
      answer: 'Currently, we support PDF, Markdown (.md), Plain Text (.txt), and Microsoft Word (.doc, .docx). We\'re working on adding support for more formats in future updates.'
    },
    {
      question: 'Is there a mobile app?',
      answer: 'Currently, ThinkSpace is available as a desktop application for Mac, Windows, and Linux. Mobile apps are planned for 2025.'
    },
    {
      question: 'How does the AI search work?',
      answer: 'Our semantic search uses advanced vector embeddings to understand the meaning and context of your queries, not just exact keyword matches. This means you can search using natural language and get more relevant results.'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-foreground font-sans selection:bg-primary/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={thinkspaceLogo} alt="ThinkSpace" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">ThinkSpace</span>
            </div>
            <div className="flex items-center gap-4">
              {isTauri ? (
                <>
                  <button
                    onClick={() => onNavigate('app')}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Launch App
                  </button>
                  <button
                    onClick={() => onNavigate('app')}
                    className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all duration-300"
                  >
                    Get Started
                  </button>
                </>
              ) : (
                <button
                  onClick={scrollToDownloads}
                  className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Downloads
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
        <HeroBackground />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight leading-tight">
              Welcome to the future of
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient-x">
                AI-Assisted Learning
              </span>
            </motion.h1>

            <motion.div variants={itemVariants} className="mb-12 max-w-3xl mx-auto space-y-4">
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                The only learning platform that adapts to <span className="text-foreground font-semibold">YOU</span> — not the other way around.
              </p>
              <p className="text-lg md:text-xl text-primary/80 font-medium tracking-wide">
                Self-guided. AI-powered. Zero boring lectures.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => (isTauri ? onNavigate('app') : scrollToDownloads())}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-primary/25 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                {isTauri ? 'Start Learning Free' : 'Download App'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              {!isTauri && (
                <button
                  onClick={scrollToDownloads}
                  className="w-full sm:w-auto px-8 py-4 bg-card/50 backdrop-blur-sm hover:bg-muted/50 text-foreground rounded-2xl font-semibold text-lg border border-border/50 hover:border-primary/50 transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                  Choose Edition
                </button>
              )}
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1 bg-background/30 rounded-full backdrop-blur-sm border border-border/30">
                <Check className="w-4 h-4 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-background/30 rounded-full backdrop-blur-sm border border-border/30">
                <Check className="w-4 h-4 text-success" />
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-background/30 rounded-full backdrop-blur-sm border border-border/30">
                <Check className="w-4 h-4 text-success" />
                <span>Setup in 30 seconds</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Downloads Section (Web) */}
      {!isTauri && (
        <section id="downloads" className="py-24 bg-card/30 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background/0 pointer-events-none" />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-5">
                Download
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> ThinkSpace</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Two editions to fit your needs — both are free to use.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Student Edition Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="mancala-card mancala-card-blue relative group"
              >
                <div className="absolute top-4 right-4 px-3 py-1 bg-blue-500/20 rounded-full text-xs font-semibold text-blue-500 border border-blue-500/30">
                  Recommended
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Student Edition</h3>
                    <p className="text-sm text-muted-foreground">Safe & focused learning</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">AI chat with study guides & visual learning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Hyperfocus timer & progress tracking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">File embedding for research papers</span>
                  </li>
                  <li className="flex items-start gap-3 text-muted-foreground">
                    <span className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">✕</span>
                    <span>No terminal/file system access (safe for sharing)</span>
                  </li>
                </ul>

                <div className="flex flex-wrap gap-3">
                  {downloadLinks.student.windows ? (
                    <a href={downloadLinks.student.windows} className="mancala-btn mancala-btn-blue flex-1 min-w-[120px] inline-flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Windows
                    </a>
                  ) : (
                    <button disabled className="mancala-btn flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed text-gray-500">
                      <Download className="w-4 h-4" /> Windows
                    </button>
                  )}
                  {downloadLinks.student.mac ? (
                    <a href={downloadLinks.student.mac} className="mancala-btn mancala-btn-blue flex-1 min-w-[120px] inline-flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> macOS
                    </a>
                  ) : (
                    <button disabled className="mancala-btn flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed text-gray-500">
                      <Download className="w-4 h-4" /> macOS
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Developer Edition Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="mancala-card mancala-card-purple relative group"
              >
                <div className="absolute top-4 right-4 px-3 py-1 bg-purple-500/20 rounded-full text-xs font-semibold text-purple-500 border border-purple-500/30">
                  Power User
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Developer Edition</h3>
                    <p className="text-sm text-muted-foreground">Full power unlocked</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Everything in Student Edition</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">AI can run terminal commands</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Full file system read/write access</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">Best for developers & power users</span>
                  </li>
                </ul>

                <div className="flex flex-wrap gap-3">
                  {downloadLinks.developer.windows ? (
                    <a href={downloadLinks.developer.windows} className="mancala-btn mancala-btn-purple flex-1 min-w-[120px] inline-flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Windows
                    </a>
                  ) : (
                    <button disabled className="mancala-btn flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed text-gray-500">
                      <Download className="w-4 h-4" /> Windows
                    </button>
                  )}
                  {downloadLinks.developer.mac ? (
                    <a href={downloadLinks.developer.mac} className="mancala-btn mancala-btn-purple flex-1 min-w-[120px] inline-flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> macOS
                    </a>
                  ) : (
                    <button disabled className="mancala-btn flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed text-gray-500">
                      <Download className="w-4 h-4" /> macOS
                    </button>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Coming Soon Notice */}
            {!hasAnyDownload && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-center mt-10"
              >
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-card/50 rounded-full border border-border text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  Downloads coming soon — we're preparing the release builds!
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-24 bg-card/30 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background/0 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Everything You Need to
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Succeed</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to enhance learning, boost productivity, and make studying enjoyable
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative bg-card/40 backdrop-blur-md rounded-3xl p-6 border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 group overflow-hidden"
                >
                  {/* Glass Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {/* Glowing Border Effect */}
                  <div className="absolute inset-0 rounded-3xl border border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                      <Icon className="w-7 h-7 text-primary group-hover:text-accent transition-colors duration-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Science/Research Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-primary/5 to-background/0 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full text-sm font-medium text-primary mb-6">
              <GraduationCap className="w-4 h-4" />
              <span>Backed by Science</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Proven to Boost
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Retention & Engagement</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              "AI-assisted paths like ours boost retention by 30% and engagement 10x over standard lectures—because learning should feel like your jam, not a chore."
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card/40 backdrop-blur-xl rounded-3xl p-8 border border-border/50 hover:border-primary/30 transition-colors relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-24 h-24" />
              </div>
              <div className="text-4xl font-bold text-primary mb-2">Up to 62%</div>
              <h3 className="text-xl font-bold mb-4">Higher Test Scores</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Adaptive AI platforms turn passive scrolling into active mastery.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Sources: 2025 Educational Technology Review, Georgia State University study
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-card/40 backdrop-blur-xl rounded-3xl p-8 border border-border/50 hover:border-primary/30 transition-colors relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Heart className="w-24 h-24" />
              </div>
              <div className="text-4xl font-bold text-primary mb-2">30%+</div>
              <h3 className="text-xl font-bold mb-4">Deeper Retention</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Personalized paths wire knowledge deeper than one-size-fits-all ever could.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Sources: ResearchGate Synthesis (2024), Frontiers in Education (2025)
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-card/40 backdrop-blur-xl rounded-3xl p-8 border border-border/50 hover:border-primary/30 transition-colors relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-24 h-24" />
              </div>
              <div className="text-4xl font-bold text-primary mb-2">Up to 10×</div>
              <h3 className="text-xl font-bold mb-4">More Engagement</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Say goodbye to burnout. AI keeps you in flow state longer than traditional methods.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Sources: Chan et al. (2025), arXiv large-scale adaptive trial
              </p>
            </motion.div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm font-medium text-muted-foreground max-w-2xl mx-auto">
              “Backed by 2024-2025 peer-reviewed studies from Stanford, Georgia State, RAND, and 60+ published papers. We don’t guess — we prove.”
            </p>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 -skew-y-3 transform origin-top-left scale-110" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Perfect for
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Everyone</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Designed with ADHD in mind — let your curiosity run free.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card/60 backdrop-blur-xl rounded-3xl p-8 border border-border/50 text-center hover:border-primary/30 transition-colors"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Students</h3>
              <p className="text-muted-foreground mb-8">
                Crush your coursework with AI-generated study guides, visual learning aids, and smart progress tracking.
              </p>
              <ul className="space-y-3 text-left bg-background/50 rounded-2xl p-6">
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">AI-powered study materials</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">Visual concept maps</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">Progress analytics</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 border-2 border-primary/20 text-center relative shadow-2xl shadow-primary/10 transform scale-105 z-10"
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full text-sm font-bold shadow-lg">
                Most Popular
              </div>
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-8 mt-4 shadow-xl shadow-purple-500/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Self-Educators</h3>
              <p className="text-muted-foreground mb-8">
                Learn anything on your own terms. AI tools that adapt to your pace with focus timers and visual-first learning.
              </p>
              <ul className="space-y-3 text-left bg-background/50 rounded-2xl p-6">
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">Hyperfocus timer</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">6 customizable themes</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">Visual-first learning</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card/60 backdrop-blur-xl rounded-3xl p-8 border border-border/50 text-center hover:border-primary/30 transition-colors"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-500/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Curious Minds</h3>
              <p className="text-muted-foreground mb-8">
                Explore any topic that sparks your interest. Embed research, search semantically, and let AI guide your learning journey.
              </p>
              <ul className="space-y-3 text-left bg-background/50 rounded-2xl p-6">
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">Follow your interests</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">Embed any document</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="p-1 bg-success/20 rounded-full"><Check className="w-3 h-3 text-success" /></div>
                  <span className="text-sm font-medium">Semantic search</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Simple, Transparent
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you need more power. All plans include our core features.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => {
              const isPaid = plan.name !== 'Free';
              const isBlurred = isPaid && !showPaidPlans;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative group overflow-hidden ${plan.name === 'Free'
                      ? 'mancala-card-dark mancala-card-dark-blue'
                      : plan.popular
                        ? 'mancala-card-dark mancala-card-dark-primary scale-105 z-10'
                        : 'mancala-card-dark mancala-card-dark-purple'
                    }`}
                >
                  {/* Blur Overlay for Paid Plans */}
                  {isBlurred && (
                    <div className="absolute inset-0 z-50 backdrop-blur-md bg-background/20 flex items-center justify-center p-6 text-center">
                      <div className="bg-background/80 backdrop-blur-xl p-6 rounded-2xl border border-primary/20 shadow-2xl">
                        <p className="text-muted-foreground mb-4 font-medium">Curious about more power?</p>
                        <button
                          onClick={() => setShowPaidPlans(true)}
                          className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all"
                        >
                          Upgrade only if you find value!
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Glass Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  {/* Glowing Border Effect */}
                  <div className={`absolute inset-0 rounded-3xl border ${plan.borderColor || 'border-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full text-sm font-bold shadow-lg z-20">
                      Most Popular
                    </div>
                  )}

                  <div className={`relative z-10 text-center mb-8 transition-all duration-500 ${isBlurred ? 'blur-sm opacity-50' : ''}`}>
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-2 flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                      <span className="text-muted-foreground text-sm font-medium">/{plan.period}</span>
                    </div>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>

                  <ul className={`relative z-10 space-y-4 mb-8 transition-all duration-500 ${isBlurred ? 'blur-sm opacity-50' : ''}`}>
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`p-0.5 rounded-full mt-0.5 ${plan.popular ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'} transition-colors duration-300`}>
                          <Check className="w-4 h-4 flex-shrink-0" />
                        </div>
                        <span className="text-muted-foreground text-sm group-hover:text-foreground transition-colors duration-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Learn More Toggle */}
                  <div className={`relative z-10 mb-8 transition-all duration-500 ${isBlurred ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
                    <button
                      onClick={() => setExpandedPlan(expandedPlan === plan.name ? null : plan.name)}
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:text-accent transition-colors mx-auto"
                    >
                      {expandedPlan === plan.name ? 'Hide Details' : 'Learn More'}
                      {expandedPlan === plan.name ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <motion.div
                      initial={false}
                      animate={{ height: expandedPlan === plan.name ? 'auto' : 0, opacity: expandedPlan === plan.name ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-2">
                        {plan.detailedLimits?.map((limit, i) => (
                          <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-primary/50" />
                            {limit}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  <button
                    onClick={() => (isTauri ? onNavigate('app') : scrollToDownloads())}
                    disabled={isBlurred}
                    className={`relative z-10 w-full py-4 rounded-xl font-bold transition-all duration-300 ${isBlurred ? 'pointer-events-none opacity-50' : ''} ${plan.popular
                      ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:scale-105'
                      : 'bg-card/50 hover:bg-primary/10 border border-border/50 hover:border-primary/50 text-foreground'
                      }`}
                  >
                    {isTauri ? plan.cta : 'Download App'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              What Early
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Testers Say</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card/40 backdrop-blur-md rounded-3xl p-8 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-lg text-muted-foreground mb-8 italic leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg overflow-hidden">
                    {testimonial.avatar ? (
                      <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-xl font-bold text-primary">
                        {testimonial.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-card/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Frequently Asked
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Questions</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border hover:border-primary/30 transition-colors"
              >
                <h3 className="text-xl font-bold mb-3">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 rounded-[3rem] p-12 md:p-20 border border-primary/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.2),transparent_70%)]" />

            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Ready to Transform
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Your Learning?</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join learners everywhere who are already thinking smarter with ThinkSpace.
              </p>
              <button
                onClick={() => (isTauri ? onNavigate('app') : scrollToDownloads())}
                className="px-12 py-5 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-2xl font-bold text-xl hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all inline-flex items-center gap-3"
              >
                {isTauri ? 'Get Started Free' : 'Download App'}
                <ArrowRight className="w-6 h-6" />
              </button>
              <p className="text-sm text-muted-foreground mt-6 font-medium">
                No credit card required • Free forever plan • Setup in 30 seconds
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 bg-card/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={thinkspaceLogo} alt="ThinkSpace" className="w-10 h-10 rounded-xl shadow-lg" />
              <span className="text-xl font-bold">ThinkSpace</span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <a
                href={privacyHref}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </a>
              <span className="opacity-60">•</span>
              <span>© 2025 ThinkSpace. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
