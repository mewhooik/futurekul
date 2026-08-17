/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Hls from "hls.js";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, Clock, FileText, Plus, Trash2, CheckCircle2, 
  HelpCircle, Sparkles, BookOpen, Layers,
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  ChevronLeft, ChevronRight, ExternalLink
} from "lucide-react";
import { ClassItem, StudyNote, UserProgress } from "../types";

interface VideoPlayerWorkspaceProps {
  currentClass: ClassItem;
  courseTitle: string;
  topicName: string;
  userProgress: UserProgress;
  onUpdateProgress: (updater: (prev: UserProgress) => UserProgress) => void;
  onBack: () => void;
}

export default function VideoPlayerWorkspace({
  currentClass,
  courseTitle,
  topicName,
  userProgress,
  onUpdateProgress,
  onBack
}: VideoPlayerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "pdfs" | "milestones">("notes");
  const [notetext, setNoteText] = useState("");
  const [noteTimestamp, setNoteTimestamp] = useState("05:00");
  
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const videoUrl = currentClass.link || currentClass.class_link || "";
  const isHlsVideo = videoUrl.toLowerCase().includes(".m3u8");
  const isYoutube = videoUrl.toLowerCase().includes("youtube.com") || 
                    videoUrl.toLowerCase().includes("youtu.be") || 
                    videoUrl.toLowerCase().includes("youtube-nocookie.com");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<"rewind" | "forward" | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [qualities, setQualities] = useState<string[]>(["Auto", "1080p", "720p", "480p", "360p"]);
  const [currentQuality, setCurrentQuality] = useState<string>("Auto");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const hlsRef = React.useRef<Hls | null>(null);
  const ytPlayerRef = React.useRef<any>(null);
  
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Auto-fill noteTimestamp based on currentTime
  useEffect(() => {
    if (currentTime > 0) {
      setNoteTimestamp(formatTime(currentTime));
    }
  }, [currentTime]);

  const handleFullscreenChange = () => {
    const isFS = !!document.fullscreenElement;
    setIsFullscreen(isFS);
    if (!isFS) {
      const orientation = typeof screen !== 'undefined' ? (screen as any).orientation : null;
      if (orientation && typeof orientation.unlock === 'function') {
        try {
          orientation.unlock();
        } catch (err) {
          console.warn("Screen orientation unlock failed:", err);
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    // Scroll page to top immediately when video workspace mounts so layout is perfectly centered without scrolling manually
    window.scrollTo({ top: 0, behavior: "instant" });
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    if (!showControls) return; // Prevent scheduling timers if controls are already naturally hidden
    const handler = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    return () => clearTimeout(handler);
  }, [showControls, isPlaying]);

  const handleMouseMove = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      setShowControls(true);
    }
  };

  const togglePlay = () => {
    if (isYoutube) {
      if (ytPlayerRef.current) {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } else {
        setIsPlaying(!isPlaying);
      }
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch((err) => console.log(err));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isYoutube) {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(val, true);
      }
      setCurrentTime(val);
      return;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleSpeedPreset = (rate: number) => {
    setPlaybackRate(rate);
    if (isYoutube) {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.setPlaybackRate(rate);
      }
      return;
    }
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleQualityChange = (quality: string) => {
    setCurrentQuality(quality);
    if (hlsRef.current) {
      if (quality === "Auto") {
        hlsRef.current.currentLevel = -1;
      } else {
        const height = parseInt(quality);
        const index = hlsRef.current.levels.findIndex((lvl) => lvl.height === height);
        if (index !== -1) {
          hlsRef.current.currentLevel = index;
        }
      }
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (isYoutube) {
      if (ytPlayerRef.current) {
        if (nextMuted) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(volume * 100);
        }
      }
      return;
    }
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const muted = val === 0;
    setIsMuted(muted);
    if (isYoutube) {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.setVolume(val * 100);
        if (muted) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
        }
      }
      return;
    }
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = muted;
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    const orientation = typeof screen !== 'undefined' ? (screen as any).orientation : null;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        // Request landscape lock on mobile devices (e.g. Chrome for Android)
        if (orientation && typeof orientation.lock === 'function') {
          orientation.lock("landscape").catch((err: any) => {
            console.warn("Screen orientation lock landscape was ignored or unsupported:", err);
          });
        }
      }).catch(err => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        // Unlock screen rotation
        if (orientation && typeof orientation.unlock === 'function') {
          try {
            orientation.unlock();
          } catch (err) {
            console.warn("Screen orientation unlock failed:", err);
          }
        }
      }).catch(err => {
        console.error("Exit fullscreen error:", err);
      });
    }
  };

  const clickTimeoutRef = React.useRef<any>(null);
  const lastClickTimeRef = React.useRef<number>(0);

  const handlePlayerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    
    // Auto-dismiss mini-menus on screen tap
    setShowQualityMenu(false);
    setShowSpeedMenu(false);
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftSide = x < rect.width / 2;

    const currentTimeNow = Date.now();
    const timeSinceLastClick = currentTimeNow - lastClickTimeRef.current;
    lastClickTimeRef.current = currentTimeNow;

    if (timeSinceLastClick < 320) {
      // CLEAR scheduled single click so it never runs!
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      // Handle double click seek without toggling any menus/controls
      if (isYoutube) {
        if (ytPlayerRef.current) {
          const currentYT = ytPlayerRef.current.getCurrentTime() || 0;
          if (isLeftSide) {
            const nextTime = Math.max(0, currentYT - 10);
            ytPlayerRef.current.seekTo(nextTime, true);
            setCurrentTime(nextTime);
            setDoubleTapFeedback("rewind");
            setTimeout(() => setDoubleTapFeedback(null), 600);
          } else {
            const durationYT = ytPlayerRef.current.getDuration() || 0;
            const nextTime = Math.min(durationYT, currentYT + 10);
            ytPlayerRef.current.seekTo(nextTime, true);
            setCurrentTime(nextTime);
            setDoubleTapFeedback("forward");
            setTimeout(() => setDoubleTapFeedback(null), 600);
          }
        }
      } else {
        const video = videoRef.current;
        if (video) {
          if (isLeftSide) {
            video.currentTime = Math.max(0, video.currentTime - 10);
            setDoubleTapFeedback("rewind");
            setTimeout(() => setDoubleTapFeedback(null), 600);
          } else {
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
            setDoubleTapFeedback("forward");
            setTimeout(() => setDoubleTapFeedback(null), 600);
          }
        }
      }
    } else {
      // Schedule single click to toggle quality/controls after 320ms delay
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        // Single tap toggle: comes on screen and goes away on tap tap
        setShowControls((prev) => !prev);
      }, 320);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (isHlsVideo) {
      let hls: Hls | null = null;

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (hls && hls.levels && hls.levels.length > 0) {
            const heights = hls.levels.map((lvl) => `${lvl.height}p`);
            const uniqueHeights = Array.from(new Set(heights)).reverse();
            setQualities(["Auto", ...uniqueHeights]);
          }
          video.play().catch((err) => {
            console.log("Auto-play was prevented. Interaction needed.", err);
          });
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoUrl;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((err) => {
            console.log("Auto-play was prevented. Interaction needed.", err);
          });
        });
      }

      return () => {
        if (hls) {
          hls.destroy();
          hlsRef.current = null;
        }
      };
    } else if (!isYoutube) {
      // Support direct video formats like .mp4, .webm, .mov natively
      video.src = videoUrl;
      setQualities(["Auto", "Source"]);
      const handleMetadata = () => {
        video.play().catch((err) => {
          console.log("Direct video auto-play prevented:", err);
        });
      };
      video.addEventListener("loadedmetadata", handleMetadata);
      return () => {
        video.src = "";
        video.removeEventListener("loadedmetadata", handleMetadata);
      };
    }
  }, [videoUrl, isHlsVideo, isYoutube]);

  // Load and control YouTube player programmatically to integrate perfectly within our custom player
  useEffect(() => {
    if (!isYoutube) return;

    setQualities(["Auto", "Source"]);
    setCurrentQuality("Auto");

    const loadYTApi = () => {
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }
    };

    loadYTApi();

    let ytPlayer: any = null;
    let intervalId: any = null;
    let destroyed = false;

    const initPlayer = () => {
      if (destroyed) return;
      const iframeId = "embed-video-iframe";
      const elem = document.getElementById(iframeId);
      if (!elem) {
        // Wait till the layout mounts the iframe element
        setTimeout(initPlayer, 100);
        return;
      }

      try {
        ytPlayer = new (window as any).YT.Player(iframeId, {
          events: {
            onReady: (event: any) => {
              if (destroyed) return;
              ytPlayerRef.current = event.target;
              setDuration(event.target.getDuration() || 0);
              event.target.setVolume(volume * 100);
              if (isMuted) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
              event.target.setPlaybackRate(playbackRate);
              if (isPlaying) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (destroyed) return;
              // Player State codes: 1 = playing, 2 = paused, 0 = ended
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
                setMilestones(prev => ({ ...prev, videoWatched: true }));
              }
            }
          }
        });
      } catch (err) {
        console.warn("YouTube Player initialization failed, retrying...", err);
        setTimeout(initPlayer, 200);
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
      // Fallback polling for library availability
      const checkYT = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkYT);
          initPlayer();
        }
      }, 150);
    }

    intervalId = setInterval(() => {
      if (destroyed) return;
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          const curr = ytPlayer.getCurrentTime();
          const dur = ytPlayer.getDuration();
          if (typeof curr === 'number' && !isNaN(curr)) {
            setCurrentTime(curr);
          }
          if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
            setDuration(dur);
          }
        } catch (e) {}
      }
    }, 250);

    return () => {
      destroyed = true;
      if (intervalId) clearInterval(intervalId);
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try {
          ytPlayer.destroy();
        } catch (e) {}
      }
      ytPlayerRef.current = null;
    };
  }, [isYoutube, videoUrl]);

  // Local states for class milestones/tasks
  const classKey = currentClass.title;
  const initialMilestones = {
    videoWatched: false,
    notesTaken: false,
    pdfReviewed: false,
    quizDone: false
  };

  const [milestones, setMilestones] = useState(() => {
    // Attempt tracking state from localStorage or userProgress
    const saved = localStorage.getItem(`milestones_${classKey}`);
    return saved ? JSON.parse(saved) : initialMilestones;
  });

  useEffect(() => {
    localStorage.setItem(`milestones_${classKey}`, JSON.stringify(milestones));
    
    // Auto sync class progress completion status to main progress
    const allDone = milestones.videoWatched && milestones.notesTaken;
    onUpdateProgress((prev) => {
      const updatedCompleted = { ...prev.completedClasses };
      if (allDone) {
        updatedCompleted[classKey] = true;
      }
      return {
        ...prev,
        completedClasses: updatedCompleted
      };
    });
  }, [milestones, classKey]);

  // Notes state
  const [classNotes, setClassNotes] = useState<StudyNote[]>(() => {
    return userProgress.notes[classKey] || [];
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notetext.trim()) return;

    const newNote: StudyNote = {
      id: Math.random().toString(36).substring(2, 9),
      classTitle: classKey,
      timestamp: noteTimestamp,
      content: notetext,
      createdAt: new Date().toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedNotes = [...classNotes, newNote];
    setClassNotes(updatedNotes);
    setNoteText("");
    
    // Reward points for taking a notes task
    onUpdateProgress((prev) => {
      const allNotes = { ...prev.notes };
      allNotes[classKey] = updatedNotes;
      return {
        ...prev,
        notes: allNotes,
        walletCoins: prev.walletCoins + 15, // reward 15 coins!
        flameStreaks: prev.flameStreaks > 0 ? prev.flameStreaks : 1
      };
    });

    setMilestones(prev => ({ ...prev, notesTaken: true }));
  };

  const handleDeleteNote = (id: string) => {
    const updatedNotes = classNotes.filter(n => n.id !== id);
    setClassNotes(updatedNotes);

    onUpdateProgress((prev) => {
      const allNotes = { ...prev.notes };
      allNotes[classKey] = updatedNotes;
      return { ...prev, notes: allNotes };
    });
  };

  const toggleMilestone = (key: keyof typeof initialMilestones) => {
    setMilestones(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Give points first time it is completed
      if (next[key] && !prev[key]) {
        onUpdateProgress(p => ({
          ...p,
          walletCoins: p.walletCoins + 20,
          flameStreaks: Math.max(p.flameStreaks, 1)
        }));
      }
      return next;
    });
  };

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return "";
    const cleanUrl = url.trim();
    try {
      let videoId = "";
      
      // 1. YouTube Live URLs like youtube.com/live/VIDEO_ID
      if (cleanUrl.includes("/live/")) {
        const parts = cleanUrl.split("/live/");
        if (parts.length > 1) {
          videoId = parts[1].split(/[?#&]/)[0];
        }
      }
      
      // 2. YouTube Shorts URLs like youtube.com/shorts/VIDEO_ID
      else if (cleanUrl.includes("/shorts/")) {
        const parts = cleanUrl.split("/shorts/");
        if (parts.length > 1) {
          videoId = parts[1].split(/[?#&]/)[0];
        }
      }
      
      // 3. YouTube Shared links like youtu.be/VIDEO_ID
      else if (cleanUrl.includes("youtu.be/")) {
        const parts = cleanUrl.split("youtu.be/");
        if (parts.length > 1) {
          videoId = parts[1].split(/[?#&]/)[0];
        }
      }
      
      // 4. Standard youtube watch link youtube.com/watch?v=VIDEO_ID
      else if (cleanUrl.match(/[?&]v=[^&#]+/)) {
        const reg = /[?&]v=([^&#]+)/;
        const match = cleanUrl.match(reg);
        if (match && match[1]) {
          videoId = match[1];
        }
      }
      
      // 5. Already embedded URLs like youtube.com/embed/VIDEO_ID
      else if (cleanUrl.includes("/embed/")) {
        const parts = cleanUrl.split("/embed/");
        if (parts.length > 1) {
          videoId = parts[1].split(/[?#&]/)[0];
        }
      }

      if (!videoId) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = cleanUrl.match(regExp);
        if (match && match[2] && match[2].length === 11) {
          videoId = match[2];
        }
      }

      if (videoId) {
        const cleanId = videoId.trim();
        const origin = window.location.origin;
        return `https://www.youtube.com/embed/${cleanId}?autoplay=1&controls=1&rel=0&showinfo=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
      }
    } catch (e) {
      console.warn("Error parsing YouTube URL:", e);
    }
    return cleanUrl;
  };

  const embedUrl = isYoutube ? getYoutubeEmbedUrl(videoUrl) : "";

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans">
      {/* Workspace Header */}
      <header className="border-b border-[#1f2937]/50 bg-[#0d1222] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            id="back_to_dashboard"
            onClick={onBack}
            className="flex items-center justify-center p-2 rounded-lg bg-[#1e293b]/40 hover:bg-[#1e293b] border border-[#334155]/25 transition-all text-slate-400 hover:text-white cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
              <span className="text-indigo-400 font-semibold font-mono tracking-wider uppercase truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none">{topicName}</span>
              <span className="text-slate-600 font-mono">•</span>
              <span className="text-slate-400 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-none">{courseTitle}</span>
            </div>
            <h1 className="text-xs sm:text-sm md:text-base font-bold text-white mt-0.5 line-clamp-1">
              {currentClass.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-400/20 text-amber-400 rounded-lg text-xs font-semibold font-mono font-sans">
            <Clock className="w-3.5 h-3.5" />
            Study Mode Active
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:overflow-hidden">
        {/* Left Hand: Video Player matches layout constraint */}
        <div className="lg:col-span-8 p-2 sm:p-4 xl:p-6 flex flex-col gap-3 sm:gap-4 lg:overflow-y-auto lg:max-h-[calc(100vh-64px)]">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#1f2937] shadow-xl shadow-black/40">
            <div 
              ref={containerRef}
              onMouseMove={handleMouseMove}
              className="absolute inset-0 w-full h-full bg-black group select-none flex items-center justify-center overflow-hidden"
            >
              {isYoutube ? (
                <iframe
                  id="embed-video-iframe"
                  src={embedUrl}
                  title={currentClass.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}

                {!isYoutube && (
                  <>
                    <div 
                      onClick={handlePlayerClick}
                      className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
                    >
                      {!isPlaying && (
                        <div className="p-4 rounded-full bg-indigo-600/95 text-white shadow-2xl shadow-indigo-500/30 border border-indigo-400/30 transform hover:scale-115 transition-transform">
                          <Play className="w-8 h-8 fill-current text-white" />
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {doubleTapFeedback === "rewind" && (
                        <motion.div 
                          key="rewind-popup"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.25 }}
                          className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-center pointer-events-none z-30"
                        >
                          <div className="flex flex-col items-center justify-center bg-black/85 border border-white/10 w-14 h-14 rounded-full shadow-2xl">
                            <div className="flex flex-row items-center justify-center text-white">
                              <ChevronLeft className="w-4 h-4 -mr-1 text-white" />
                              <ChevronLeft className="w-4 h-4 text-white/70" />
                            </div>
                            <span className="text-[9px] uppercase font-black text-slate-300 mt-0.5">-10s</span>
                          </div>
                        </motion.div>
                      )}

                      {doubleTapFeedback === "forward" && (
                        <motion.div 
                          key="forward-popup"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.25 }}
                          className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-center pointer-events-none z-30"
                        >
                          <div className="flex flex-col items-center justify-center bg-black/85 border border-white/10 w-14 h-14 rounded-full shadow-2xl">
                            <div className="flex flex-row items-center justify-center text-white">
                              <ChevronRight className="w-4 h-4 text-white/70" />
                              <ChevronRight className="w-4 h-4 -ml-1 text-white" />
                            </div>
                            <span className="text-[9px] uppercase font-black text-slate-300 mt-0.5">+10s</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div 
                      className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/100 via-black/80 to-transparent p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 transition-opacity duration-300 z-20 custom-player-control ${
                        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-3">
                        <span className="text-[9px] sm:text-[11px] font-semibold text-slate-300 font-mono">
                          {formatTime(currentTime)}
                        </span>
                        <input 
                          type="range"
                          min={0}
                          max={duration || 0}
                          step={0.1}
                          value={currentTime}
                          onChange={handleSeekChange}
                          className="flex-1 h-0.5 sm:h-1 rounded-lg bg-slate-700/60 accent-indigo-500 hover:accent-indigo-400 cursor-pointer transition-all"
                        />
                        <span className="text-[9px] sm:text-[11px] font-semibold text-slate-400 font-mono">
                          {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        <div className="flex items-center gap-1 sm:gap-3">
                          <button 
                            onClick={togglePlay}
                            className="p-1 sm:p-2 text-white hover:text-indigo-400 hover:bg-slate-800/60 rounded-lg sm:rounded-xl transition-all cursor-pointer"
                            title={isPlaying ? "Pause Video" : "Play Video"}
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current" />}
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowQualityMenu(!showQualityMenu);
                                setShowSpeedMenu(false);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[9px] sm:text-xs rounded-full bg-[#0a0f1d]/90 hover:bg-[#12192c]/95 border border-[#1f2937] hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all cursor-pointer font-bold font-sans tracking-wide shadow-md"
                            >
                              <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                              <span className="font-mono text-indigo-300 font-bold">{currentQuality}</span>
                            </button>
                            
                            {showQualityMenu && (
                              <div className="absolute bottom-full left-0 mb-3 w-28 bg-[#0d1220] border border-indigo-500/35 rounded-xl p-1 shadow-2xl z-30 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="text-[9px] text-[#8492a6] font-extrabold uppercase px-2 py-1 border-b border-indigo-500/10 mb-1">
                                  Quality
                                </div>
                                {qualities.map((q) => (
                                  <button
                                    key={q}
                                    onClick={() => {
                                      handleQualityChange(q);
                                      setShowQualityMenu(false);
                                    }}
                                    className={`px-2 py-0.5 text-left text-[11px] font-mono rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                                      currentQuality === q
                                        ? "bg-indigo-600/30 text-indigo-300 font-extrabold"
                                        : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                                    }`}
                                  >
                                    <span>{q}</span>
                                    {currentQuality === q && <span className="w-1 h-1 rounded-full bg-indigo-400" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

                          <div className="flex items-center gap-0.5 sm:gap-1.5 group/volume">
                            <button 
                              onClick={toggleMute}
                              className="p-1 sm:p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg sm:rounded-xl transition-all cursor-pointer"
                            >
                              {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            </button>
                            <input 
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="hidden sm:inline-block w-12 md:w-16 h-1 rounded bg-slate-800 accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-3">
                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowSpeedMenu(!showSpeedMenu);
                                setShowQualityMenu(false);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[9px] sm:text-xs rounded-full bg-[#0a0f1d]/90 hover:bg-[#12192c]/95 border border-[#1f2937] hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all cursor-pointer font-bold font-sans tracking-wide shadow-md"
                            >
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-mono text-emerald-300 font-bold">{playbackRate}x</span>
                            </button>

                            {showSpeedMenu && (
                              <div className="absolute bottom-full right-0 mb-3 w-28 bg-[#0d1220] border border-emerald-500/35 rounded-xl p-1 shadow-2xl z-30 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="text-[9px] text-[#8492a6] font-extrabold uppercase px-2 py-1 border-b border-emerald-500/10 mb-1 font-sans">
                                  Play Speed
                                </div>
                                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                                  <button
                                    key={rate}
                                    onClick={() => {
                                      handleSpeedPreset(rate);
                                      setShowSpeedMenu(false);
                                    }}
                                    className={`px-2 py-0.5 text-left text-[11px] font-mono rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                                      playbackRate === rate
                                        ? "bg-emerald-600/30 text-emerald-300 font-extrabold"
                                        : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                                    }`}
                                  >
                                    <span>{rate === 1 ? "1.0x" : `${rate}x`}</span>
                                    {playbackRate === rate && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="w-[1px] h-3.5 bg-slate-800" />

                          <button 
                            onClick={toggleFullscreen}
                            className="p-1 sm:p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg sm:rounded-xl transition-all cursor-pointer"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Option"}
                          >
                            {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>

          <div className="bg-[#111827]/60 border border-[#1f2937]/50 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 flex-shrink-0 bg-indigo-500/10 border border-indigo-400/20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-white">Study Class Metadata</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                  Faculty: <span className="text-indigo-300 font-medium font-mono">Futurekul Classroom Faculty</span>
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] sm:text-[11px] text-slate-500">
                  <span className="bg-[#1e293b] px-2 py-0.5 rounded">Duration: 1h 2m</span>
                  <span>•</span>
                  <span>Released: {currentClass.createDate ? new Date(currentClass.createDate).toLocaleDateString('en-US') : "Live Class"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Centered Primary Mark to Complete Action */}
          <div className="flex justify-center select-none py-1">
            <button
              onClick={() => {
                const state = !milestones.videoWatched;
                toggleMilestone("videoWatched");
                if (state) toggleMilestone("notesTaken");
              }}
              className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl border text-[11px] sm:text-xs font-black tracking-wider transition-all cursor-pointer border-slate-700/80 shadow-md active:scale-95 ${
                milestones.videoWatched 
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10"
                  : "bg-indigo-600 hover:bg-indigo-500 border-indigo-500/20 text-white shadow-indigo-950/40"
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${milestones.videoWatched ? 'animate-bounce text-emerald-400' : 'text-indigo-200'}`} />
              {milestones.videoWatched ? "CLASS COMPLETED ✓" : "MARK AS COMPLETED"}
            </button>
          </div>
        </div>

        {/* Right Hand: Interactive Workspace (Notes & PDF/PPT) */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#1f2937]/80 bg-[#0d1222]/55 flex flex-col lg:max-h-[calc(100vh-64px)] lg:overflow-hidden">
          <div className="grid grid-cols-3 border-b border-[#1f2937] bg-[#0c101d] p-1 sm:p-1.5 gap-1 sm:gap-1.5 font-sans">
            <button
              onClick={() => setActiveTab("notes")}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === "notes"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Add Notes</span>
            </button>
            <button
              onClick={() => setActiveTab("pdfs")}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === "pdfs"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">PPT / Work</span>
            </button>
            <button
              onClick={() => setActiveTab("milestones")}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === "milestones"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Layers className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Progress</span>
            </button>
          </div>

          <div className="h-[480px] lg:h-auto lg:flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-sans">
            {activeTab === "notes" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <form onSubmit={handleAddNote} className="space-y-3 bg-[#111827]/50 border border-[#1f2937]/50 p-4 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-300">Add Study Note</span>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-505/5 px-2 bg-indigo-950/20 py-0.5 rounded border border-indigo-500/10">
                      <Clock className="w-3 h-3" />
                      Timestamp:
                      <input 
                        type="text" 
                        value={noteTimestamp}
                        onChange={(e) => setNoteTimestamp(e.target.value)}
                        className="w-10 bg-transparent text-indigo-300 font-semibold focus:outline-none text-center font-mono"
                      />
                    </div>
                  </div>
                  
                  <textarea
                    rows={3}
                    value={notetext}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Type your smart study insights, formulas, or Vocabulary note here..."
                    className="w-full bg-[#090d16] border border-[#1f2937] p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 resize-none placeholder:text-slate-600 leading-relaxed"
                  />

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#2563eb] hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/10 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Note Node
                  </button>
                </form>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    Saved Class Notes ({classNotes.length})
                  </h4>

                  {classNotes.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-[#1f2937]/50 bg-[#111827]/15 rounded-xl p-4">
                      <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">No notes added. Please add your notes for quick study references.</p>
                    </div>
                  ) : (
                    classNotes.map((note) => (
                      <div key={note.id} className="p-3 bg-[#111827]/60 border border-[#1f2937]/50 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-semibold rounded">
                            ⌛ {note.timestamp}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">{note.createdAt}</span>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-slate-500 hover:text-rose-400 p-0.5"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans select-all">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "pdfs" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-[#1e293b]/40 border border-[#334155]/20 p-2 rounded-lg">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Read reference PDFs and study worksheets.
                </div>

                {(!currentClass.classPdf || currentClass.classPdf.length === 0) ? (
                  <div className="text-center py-8 border border-dashed border-[#1f2937]/50 bg-[#111827]/15 rounded-xl p-4 text-slate-500">
                    <p className="text-xs font-medium">No official PDF files loaded for this class.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentClass.classPdf.map((pdf, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-[#111827]/60 border border-[#1f2937]/50 rounded-xl flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-rose-500/10 border border-rose-400/20 text-rose-400 rounded-lg">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-white truncate pr-2 group-hover:text-amber-400 transition-colors">
                              {pdf.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 uppercase mt-0.5 font-mono">Official PDF Worksheet</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a
                            href={pdf.uploadPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              toggleMilestone("pdfReviewed");
                            }}
                            className="px-2.5 py-1.5 bg-[#19194d] hover:bg-emerald-600 text-white text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1 text-center cursor-pointer font-sans"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "milestones" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="bg-[#111827]/50 border border-[#1f2937]/50 p-4 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Class Tasks Milestones</h3>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Completion Rate</span>
                      <span className="text-emerald-400">
                        {Math.round(
                          (Number(milestones.videoWatched) +
                            Number(milestones.notesTaken) +
                            Number(milestones.pdfReviewed) +
                            Number(milestones.quizDone)) * 25
                        )}%
                      </span>
                    </div>
                    <div className="w-full bg-[#111827] h-2 rounded-full overflow-hidden border border-[#1f2937]/50">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        style={{
                          width: `${
                            (Number(milestones.videoWatched) +
                              Number(milestones.notesTaken) +
                              Number(milestones.pdfReviewed) +
                              Number(milestones.quizDone)) * 25
                          }%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <button
                      onClick={() => toggleMilestone("videoWatched")}
                      className="w-full flex items-center justify-between p-2.5 bg-[#0a0d16] hover:bg-[#111827] rounded-lg border border-[#1f2937]/70 text-left transition-all text-xs text-slate-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${milestones.videoWatched ? 'text-emerald-400' : 'text-slate-600'}`} />
                        Watch class lecture video
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">25 pts</span>
                    </button>

                    <button
                      onClick={() => toggleMilestone("notesTaken")}
                      className="w-full flex items-center justify-between p-2.5 bg-[#0a0d16] hover:bg-[#111827] rounded-lg border border-[#1f2937]/70 text-left transition-all text-xs text-slate-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${milestones.notesTaken ? 'text-emerald-400' : 'text-slate-600'}`} />
                        Add key reference notes
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">25 pts</span>
                    </button>

                    <button
                      onClick={() => toggleMilestone("pdfReviewed")}
                      className="w-full flex items-center justify-between p-2.5 bg-[#0a0d16] hover:bg-[#111827] rounded-lg border border-[#1f2937]/70 text-left transition-all text-xs text-slate-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${milestones.pdfReviewed ? 'text-emerald-400' : 'text-slate-600'}`} />
                        Study worksheet resources
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">25 pts</span>
                    </button>

                    <button
                      onClick={() => toggleMilestone("quizDone")}
                      className="w-full flex items-center justify-between p-2.5 bg-[#0a0d16] hover:bg-[#111827] rounded-lg border border-[#1f2937]/70 text-left transition-all text-xs text-slate-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${milestones.quizDone ? 'text-emerald-400' : 'text-slate-600'}`} />
                        Verify doubt practice set
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">25 pts</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-[#1f2937]/50 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1 font-sans">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Complete tasks to earn streak points!
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
