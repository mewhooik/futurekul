import React, { useState, useEffect, useMemo } from "react";
import { 
  Tv, 
  Flame, 
  Search, 
  Heart, 
  X, 
  Calendar, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft,
  Award, 
  BookOpen,  
  Info,
  Play,
  FileText,
  Download,
  Check,
  CheckCircle,
  Layers,
  Lock,
  Monitor,
  Video,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Course, ClassItem, UserProgress } from "./types";
import VideoPlayerWorkspace from "./components/VideoPlayerWorkspace";
import WhatsAppPopup from "./components/WhatsAppPopup";

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<"live" | "recorded">("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // User progress state for the workspace player (with premium stats syncing)
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem("futurekul_user_progress");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      notes: {},
      completedClasses: {},
      walletCoins: 120, // default friendly starting currency
      flameStreaks: 3 // default friendly starting streaks
    };
  });

  // Keep progress preserved
  useEffect(() => {
    localStorage.setItem("futurekul_user_progress", JSON.stringify(userProgress));
  }, [userProgress]);

  // Active playing workspace class
  const [activeWorkspaceClass, setActiveWorkspaceClass] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<"overview" | "video" | "pdf">("overview");
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"loading" | "live_api" | "offline_fallback">("loading");
  
  // Real-time fetched materials of the chosen batch (Videos, PDFs)
  const [courseData, setCourseData] = useState<any>(null);
  const [fetchingCourseData, setFetchingCourseData] = useState(false);
  const [tabSearchQuery, setTabSearchQuery] = useState("");

  // Load batch special syllabus details (Free classes, Paid classes and PDFs) straight from original Futurekul
  const loadBatchSyllabus = async (courseId: string) => {
    try {
      setFetchingCourseData(true);
      
      // Try local server proxy first
      const res = await fetch(`/api/course-data/${courseId}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.state === 200 && json.data) {
          setCourseData(json.data);
          return;
        }
      }
      
      // Secondary client-side fallback fetch
      const direct = await fetch(`https://www.futurekul.com/admin/api/getCourseDataByTopic-v2/${courseId}/`, {
        headers: { "Accept": "application/json" }
      });
      if (direct.ok) {
        const json = await direct.json();
        if (json && json.data) {
          setCourseData(json.data);
          return;
        }
      }
      
      setCourseData(null);
    } catch (err) {
      console.error("Failed fetching dynamic course materials:", err);
      setCourseData(null);
    } finally {
      setFetchingCourseData(false);
    }
  };

  // Trigger loading syllabus upon batch click
  useEffect(() => {
    if (selectedCourse) {
      setCourseData(null);
      setTabSearchQuery(""); // Reset inner search query on batch change
      loadBatchSyllabus(selectedCourse.id);
    } else {
      setCourseData(null);
      setTabSearchQuery("");
    }
  }, [selectedCourse]);

  // Extract all videos dynamically so that NO URL is missed
  const parsedVideos = useMemo(() => {
    const vids: Array<{ id: string; title: string; link: string; topicName: string; isFree: boolean }> = [];
    if (!courseData) return vids;

    // 1) Handle free_class lists
    if (Array.isArray(courseData.free_class)) {
      courseData.free_class.forEach((c: any, idx: number) => {
        if (c && c.link) {
          const rawTitle = (c.class_name || "").replace(/<[^>]+>/g, "").trim();
          vids.push({
            id: `free-${idx}`,
            title: rawTitle || `Free Demo Class #${idx + 1}`,
            link: c.link,
            topicName: "Free Demo Classes",
            isFree: true
          });
        }
      });
    }

    // 2) Handle paid_class structure
    if (Array.isArray(courseData.paid_class)) {
      courseData.paid_class.forEach((topicObj: any, topicIdx: number) => {
        const topicName = (topicObj.topic || "").replace(/<[^>]+>/g, "").trim() || "Course Lectures";
        if (Array.isArray(topicObj.class)) {
          topicObj.class.forEach((c: any, classIdx: number) => {
            if (c && c.link) {
              const rawTitle = (c.class_name || "").replace(/<[^>]+>/g, "").trim();
              vids.push({
                id: `paid-${topicIdx}-${classIdx}`,
                title: rawTitle || `Lecture Session #${classIdx + 1}`,
                link: c.link,
                topicName: topicName,
                isFree: false
              });
            }
          });
        }
      });
    }

    return vids;
  }, [courseData]);

  // Extract all PDFs dynamically so that NO URL is missed
  const parsedPdfs = useMemo(() => {
    const docs: Array<{ id: string; title: string; link: string; topicName: string }> = [];
    if (!courseData) return docs;

    if (Array.isArray(courseData.pdf)) {
      courseData.pdf.forEach((pdfTopic: any, ptIdx: number) => {
        const topicName = (pdfTopic.topic_name || "").replace(/<[^>]+>/g, "").trim() || "Study Materials";
        if (Array.isArray(pdfTopic.pdf)) {
          pdfTopic.pdf.forEach((p: any, pIdx: number) => {
            if (p && p.pdf_mobile) {
              const rawTitle = (p.pdf_name || "").replace(/<[^>]+>/g, "").trim();
              docs.push({
                id: `pdf-${ptIdx}-${pIdx}`,
                title: rawTitle || `Lecture Note Doc #${pIdx + 1}`,
                link: p.pdf_mobile,
                topicName: topicName
              });
            }
          });
        }
      });
    }

    return docs;
  }, [courseData]);
  
  // Track liked course IDs locally to allow active, satisfying interactions
  const [localLikedIds, setLocalLikedIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("fk_favorites_list");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Toggle state to view only favorited batches (both live and record merged)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Track scroll position to show a floating search bar trigger at bottom-right
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);

  // Scroll event listener block
  useEffect(() => {
    const handleScroll = () => {
      // Show search fab when scrolled past 260px (when search bar goes out of view)
      if (window.scrollY > 260) {
        setShowFloatingSearch(true);
      } else {
        setShowFloatingSearch(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll & focus utility for the search action
  const scrollToSearch = () => {
    const searchInput = document.getElementById("course-search-input");
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      // Short delay to allow smooth scroll animation to finish, then focus
      setTimeout(() => {
        searchInput.focus();
      }, 350);
    }
  };

  // Synchronize with localStorage
  useEffect(() => {
    localStorage.setItem("fk_favorites_list", JSON.stringify(localLikedIds));
  }, [localLikedIds]);

  // Toast message auto-timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Fetch courses on mount with robust client-side direct fallback for static environments like Netlify
  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let coursesData: Course[] = [];
      let success = false;
      
      // Try local Express server API first
      try {
        const res = await fetch("/api/courses");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const payload = await res.json();
            if (payload && payload.state === 200 && Array.isArray(payload.data)) {
              coursesData = payload.data;
              success = true;
              setDataSource("live_api");
            }
          }
        }
      } catch (localErr) {
        console.warn("Local API fetch failed, trying direct client-side fetch fallback...", localErr);
      }

      // If local API failed or didn't return JSON, fetch directly from the original endpoints!
      if (!success) {
        console.log("Direct frontend fetch from original Futurekul API...");
        const [liveRes, recordRes] = await Promise.all([
          fetch("https://www.futurekul.com/admin/api/course/135/1/", {
            headers: { "Accept": "application/json" }
          }),
          fetch("https://www.futurekul.com/admin/api/course/135/0/", {
            headers: { "Accept": "application/json" }
          })
        ]);

        if (liveRes.ok && recordRes.ok) {
          const liveJson = await liveRes.json();
          const recordJson = await recordRes.json();

          const liveList = Array.isArray(liveJson.data) ? liveJson.data : [];
          const recordList = Array.isArray(recordJson.data) ? recordJson.data : [];

          const mappedLive = liveList.map((c: any) => ({ ...c, is_live: "1" }));
          const mappedRecord = recordList.map((c: any) => ({ ...c, is_live: "0" }));

          coursesData = [...mappedLive, ...mappedRecord];
          success = true;
          setDataSource("live_api");
        } else {
          throw new Error("Direct client-side fetch from Futurekul API failed or timed out.");
        }
      }

      if (success) {
        setCourses(coursesData);
      } else {
        throw new Error("Failed to load courses from any database or API source");
      }
    } catch (err: any) {
      console.error("Course load error:", err);
      setError(err.message || "Failed to load courses. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Filter and Search Logic
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Determine if favorited
      const isFav = localLikedIds[course.id] !== undefined 
        ? localLikedIds[course.id] 
        : course.is_liked === 1;

      // Filter by favorites only (or filter by specific tab)
      if (showFavoritesOnly) {
        if (!isFav) return false;
      } else {
        const targetLiveState = activeTab === "live" ? "1" : "0";
        if (course.is_live !== targetLiveState) return false;
      }

      // Filter by search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        return (
          course.title.toLowerCase().includes(query) ||
          course.main_cat_name.toLowerCase().includes(query) ||
          course.header_name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [courses, activeTab, searchQuery, showFavoritesOnly, localLikedIds]);

  // Tab Counts for UI indicator badges
  const tabCounts = useMemo(() => {
    return {
      live: courses.filter(c => c.is_live === "1").length,
      recorded: courses.filter(c => c.is_live === "0").length,
    };
  }, [courses]);

  // Total favorites count for badge indicator
  const totalFavoritesCount = useMemo(() => {
    return courses.filter((course) => {
      return localLikedIds[course.id] !== undefined 
        ? localLikedIds[course.id] 
        : course.is_liked === 1;
    }).length;
  }, [courses, localLikedIds]);

  // Handle Like action locally
  const toggleLike = (courseId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    setLocalLikedIds(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Helper for rendering date format neatly
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr.replace(/-/g, "/"));
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  if (activeWorkspaceClass) {
    const currentClassItem: ClassItem = {
      title: activeWorkspaceClass.title,
      link: activeWorkspaceClass.link,
      class_link: activeWorkspaceClass.link,
      createDate: new Date().toISOString(),
      classPdf: parsedPdfs
        .filter(pdf => pdf.topicName === activeWorkspaceClass.topicName)
        .map(pdf => ({ title: pdf.title, uploadPdf: pdf.link }))
    };
    return (
      <VideoPlayerWorkspace
        currentClass={currentClassItem}
        courseTitle={selectedCourse?.title || "Class Lecture"}
        topicName={activeWorkspaceClass.topicName || "Class Session"}
        userProgress={userProgress}
        onUpdateProgress={setUserProgress}
        onBack={() => setActiveWorkspaceClass(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#fbfbfd]" id="app-container">
      
      {/* 2. Brand navigation header - Futurekul Logo & My Fav Button on the side */}
      <header className="bg-[#19194d] text-white shadow-md sticky top-0 z-40" id="main-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center gap-2 cursor-pointer select-none" 
            id="brand-logo" 
            onClick={() => { 
              setSearchQuery(""); 
              setShowFavoritesOnly(false);
              setActiveTab("live"); 
            }}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-full h-full select-none pointer-events-none p-0.5">
                <circle cx="100" cy="100" r="95" fill="#ffffff" />
                <path d="M 55 175 A 85 85 0 1 1 175 65" fill="none" stroke="#0c5da5" strokeWidth="14" strokeLinecap="round" />
                <path d="M 175 75 A 85 85 0 0 1 50 165" fill="none" stroke="#e11d48" strokeWidth="11" strokeLinecap="round" />
                <path d="M 45 110 Q 75 135 115 110 T 155 110" fill="none" stroke="#e11d48" strokeWidth="5" strokeLinecap="round" />
                <path d="M 55 138 Q 85 155 115 138 T 145 138" fill="none" stroke="#e11d48" strokeWidth="4" strokeLinecap="round" />
                <path d="M 65 72 C 75 60, 115 58, 140 70 C 145 73, 148 68, 140 64 C 115 52, 75 55, 60 68 C 55 72, 60 76, 65 72 Z" fill="#0c5da5" />
                <path d="M 112 66 C 110 85, 96 112, 83 134 C 78 142, 73 148, 79 146 C 90 142, 110 128, 120 118 C 122 116, 120 113, 116 115 C 108 122, 92 134, 85 137 C 95 118, 107 90, 112 66 Z" fill="#0c5da5" />
                <path d="M 115 118 C 111 113, 105 101, 116 91 C 124 83, 134 89, 132 96 C 129 103, 119 114, 110 118 C 105 120, 103 117, 109 114 C 117 109, 124 101, 126 96 C 128 93, 121 88, 115 96 C 109 104, 112 113, 115 118 Z" fill="#0c5da5" />
              </svg>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[#fdbe14] font-black text-xl tracking-tight leading-none">FUTURE</span>
              <span className="text-white font-bold text-xl tracking-tight leading-none">कुल</span>
            </div>
          </div>

          {/* Premium "My Fav" Filter Trigger Button placed on the right side for all screens */}
          <button
            id="my-favorites-pill-button"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 select-none cursor-pointer border ${
              showFavoritesOnly 
                ? "bg-[#fdbe14] text-[#19194d] border-[#fdbe14] scale-102 shadow-md"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-[#19194d] text-[#19194d] text-red-600" : "text-rose-400"}`} />
            <span className="font-extrabold">My Fav</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${showFavoritesOnly ? "bg-[#19194d] text-white" : "bg-white/20 text-[#fdbe14]"}`}>
              {totalFavoritesCount}
            </span>
          </button>

        </div>
      </header>

      {/* 4. Controls & Search Panel - Start directly for a compact layout */}
      <main className="max-w-7xl w-full mx-auto px-4 md:px-6 py-6 flex-grow" id="main-content-area">
        <AnimatePresence mode="wait">
          {selectedCourse ? (
            /* ====================================================
               NATIVE SUB-PAGE COURSE DETAILS VIEW (SAME VIEWPORT)
               ==================================================== */
            <motion.div
              key="details-subpage"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 max-w-4xl mx-auto"
              id="subpage-details-wrapper"
            >
              {/* Sticky-ready Back Navigation bar */}
              <div 
                className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4"
                id="details-back-row"
              >
                <button
                  onClick={() => {
                    setSelectedCourse(null);
                    setPlayingVideo(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#19194d] text-sm font-extrabold rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer group active:scale-95 select-none"
                  id="details-back-head-button"
                >
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform text-slate-500 group-hover:text-[#19194d]" />
                  <span>Back to Batches</span>
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLike(selectedCourse.id)}
                    className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition-all cursor-pointer flex items-center justify-center shadow-sm"
                    title="Favorite Course"
                  >
                    <Heart className={`w-5 h-5 ${localLikedIds[selectedCourse.id] ? "fill-rose-500 text-rose-500 scale-105" : "text-slate-400"}`} />
                  </button>
                  <span className="text-[10px] md:text-xs font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 py-2 px-3 rounded-xl select-none hidden sm:inline-block">
                    BATCH RECORD: #{selectedCourse.id}
                  </span>
                </div>
              </div>

              {/* THREE NAVIGATION OPTIONS TAB BAR (Overview, Video, PDF) DIRECTLY UNDER BACK BUTTON */}
              <div className="border-b border-slate-200" id="subpage-tabs-bar">
                <div className="grid grid-cols-3 md:flex md:gap-2 w-full md:w-auto" id="tabs-indicator-row">
                  
                  {/* Overview Tab Option */}
                  <button
                    onClick={() => setModalTab("overview")}
                    className={`relative text-center md:text-left px-2 sm:px-5 py-3 text-xs md:text-sm font-extrabold tracking-wide transition-all shrink-0 cursor-pointer select-none pb-3.5 ${
                      modalTab === "overview"
                        ? "text-[#19194d]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    id="tab-overview-btn"
                  >
                    <span>Overview</span>
                    {modalTab === "overview" && (
                      <motion.div 
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#10b981] rounded-full" 
                      />
                    )}
                  </button>

                  {/* Video Tab Option */}
                  <button
                    onClick={() => setModalTab("video")}
                    className={`relative text-center md:text-left px-2 sm:px-5 py-3 text-xs md:text-sm font-extrabold tracking-wide transition-all shrink-0 cursor-pointer select-none pb-3.5 ${
                      modalTab === "video"
                        ? "text-[#19194d]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    id="tab-video-btn"
                  >
                    <span>Video</span>
                    {modalTab === "video" && (
                      <motion.div 
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#10b981] rounded-full" 
                      />
                    )}
                  </button>

                  {/* PDF Tab Option */}
                  <button
                    onClick={() => setModalTab("pdf")}
                    className={`relative text-center md:text-left px-2 sm:px-5 py-3 text-xs md:text-sm font-extrabold tracking-wide transition-all shrink-0 cursor-pointer select-none pb-3.5 ${
                      modalTab === "pdf"
                        ? "text-[#19194d]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    id="tab-pdf-btn"
                  >
                    <span>PDF</span>
                    {modalTab === "pdf" && (
                      <motion.div 
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#10b981] rounded-full" 
                      />
                    )}
                  </button>

                </div>
              </div>

              {/* DYNAMIC TAB ENVELOPE DISPLAY */}
              <div className="space-y-6" id="subpage-tabs-content-envelope">
                
                {/* 1. OVERVIEW SCREEN DISPLAY */}
                {modalTab === "overview" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 text-left"
                    key="overview-panels"
                  >
                    {/* Course Header Banner Title */}
                    <div className="space-y-2">
                      <span className="text-[10px] md:text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                        {selectedCourse.main_cat_name || "Academic Batch"}
                      </span>
                      <h2 className="text-xl md:text-3.5xl font-extrabold text-[#19194d] leading-tight tracking-tight pt-1">
                        {selectedCourse.title}
                      </h2>
                    </div>

                    {/* Clean formatted premium Banner frame */}
                    <div className="bg-slate-100 rounded-3xl overflow-hidden shadow-md border border-slate-200/60 aspect-video relative">
                      <img
                        src={selectedCourse.banner}
                        alt={selectedCourse.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60";
                        }}
                      />
                    </div>

                    {/* Key Dates block details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Starts On</p>
                          <p className="text-sm font-extrabold text-slate-800">{formatDate(selectedCourse.start_date.split(" ")[0])}</p>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ends On</p>
                          <p className="text-sm font-extrabold text-slate-800">{formatDate(selectedCourse.end_date.split(" ")[0])}</p>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                          <Tv className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Type Format</p>
                          <p className="text-sm font-extrabold text-slate-800">{selectedCourse.is_live === "1" ? "Live Batch Class" : "Recorded VOD Class"}</p>
                        </div>
                      </div>

                    </div>

                    {/* Syllabus Target & Course Highlights checklist card */}
                    <div 
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4"
                      id="syllabus-highlights-section"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#10b981] border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                          <BookOpen className="w-5.5 h-5.5" />
                        </div>
                        <div>
                          <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                            Syllabus Target & Course Highlights
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Futurekul Academic Guidance</p>
                        </div>
                      </div>

                      <div className="space-y-4 text-slate-600 text-xs md:text-sm leading-relaxed font-semibold">
                        <p>
                          We will cover standard syllabus topics for <span className="text-[#19194d] font-extrabold">{selectedCourse.main_cat_name} - {selectedCourse.title}</span> students according to the latest competitive curriculum targets.
                        </p>
                        <p>
                          In this dynamic, complete offline-online curriculum, students participate in rigorous training exercises including direct standard exam questions framing.
                        </p>
                        <p>
                          This is a Live Interactive Course. The complete syllabus will be thoroughly covered in-depth. You will retain unlimited video & notes access until your final exams.
                        </p>

                        <div className="bg-slate-50 rounded-2xl border border-slate-200/70 p-4 mt-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-[#19194d] mb-2.5">
                            Key Offerings Breakdown:
                          </h4>
                          <ul className="space-y-2 text-xs text-slate-700">
                            <li className="flex items-start gap-2.5">
                              <span className="text-emerald-500 font-black shrink-0">✓</span>
                              <span>Special live instructional lectures with unlimited replay assistance.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="text-emerald-500 font-black shrink-0">✓</span>
                              <span>Comprehensive textbook question solvers and printable PDF files.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="text-emerald-500 font-black shrink-0">✓</span>
                              <span>Topic-wise practice exercises under professional supervision.</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Raw HTML description as secondary overview */}
                      {selectedCourse.description && (
                        <div className="border-t border-slate-100 pt-4 space-y-2">
                          <h4 className="text-xs font-black uppercase tracking-widest text-[#19194d] flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span>Detailed Curriculums Scope</span>
                          </h4>
                          <div 
                            className="course-description text-slate-500 text-xs md:text-sm leading-relaxed pr-2"
                            dangerouslySetInnerHTML={{ __html: selectedCourse.description }}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* 2. VIDEO TAB DISPLAY (Real dynamic premium lectures list grouped by topics) */}
                {modalTab === "video" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 text-left"
                    key="video-panels-dynamic"
                  >
                    {fetchingCourseData ? (
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-3 shadow-sm text-slate-700">
                        <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-[#10b981] animate-spin mx-auto"></div>
                        <p className="text-[#10b981] font-black text-xs tracking-wider animate-pulse uppercase">Fetching Lecture Video Streams...</p>
                        <p className="text-slate-400 text-[11px]">Accessing Futurekul direct classroom server</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 md:p-6 space-y-4 text-slate-800">
                        {/* Dynamic and filtered Videos List */}
                        <div className="space-y-2">
                          {(() => {
                            const list = parsedVideos.length > 0 ? parsedVideos : [
                              { id: "fallback-v1", title: "Intro Strategy Discussion & Syllabus Micro Outline", link: "https://www.futurekul.com/", topicName: "Course Overview & Strategy", isFree: true },
                              { id: "fallback-v2", title: "General Physics Chapter 1: Units, Measurement & PYQs", link: "https://www.futurekul.com/", topicName: "Physics", isFree: false },
                              { id: "fallback-v3", title: "Railway Mathematics Core Specialty Shortcut Formulas", link: "https://www.futurekul.com/", topicName: "Mathematics", isFree: false }
                            ];

                            return list.map((vid) => {
                              const savedMilestones = localStorage.getItem(`milestones_${vid.title}`);
                              const isCompleted = savedMilestones ? JSON.parse(savedMilestones).videoWatched : false;

                              return (
                                <div 
                                  key={vid.id} 
                                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 duration-150 transition-all group shadow-sm ${
                                    isCompleted 
                                      ? "bg-emerald-50/70 border-emerald-300 shadow-emerald-50/50 hover:bg-emerald-50" 
                                      : "bg-white border-slate-200 hover:border-[#19194d]/30 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform border ${
                                      isCompleted
                                        ? "bg-emerald-500 text-white border-emerald-500"
                                        : "bg-[#19194d]/5 text-[#19194d] border-[#19194d]/10"
                                    }`}>
                                      {isCompleted ? (
                                        <Check className="w-4 h-4 text-white font-extrabold stroke-[3]" />
                                      ) : (
                                        <Play className="w-4 h-4 text-[#19194d] fill-current ml-0.5" />
                                      )}
                                    </div>
                                    <div className="min-w-0 text-left">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs sm:text-sm font-extrabold transition-colors leading-relaxed break-words ${
                                          isCompleted ? "text-emerald-800" : "text-slate-800 group-hover:text-[#10b981]"
                                        }`}>{vid.title}</span>
                                        {isCompleted && (
                                          <span className="bg-emerald-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase shrink-0">
                                            Completed ✓
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <button 
                                    onClick={() => {
                                      setActiveWorkspaceClass(vid);
                                    }}
                                    className={`w-full sm:w-auto py-2 px-4 rounded-lg text-xs font-black tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 select-none uppercase shadow-sm whitespace-nowrap ${
                                      isCompleted
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-[#19194d] hover:bg-[#10b981] text-white"
                                    }`}
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>{isCompleted ? "COMPLETED ✓ REVIEW" : "WATCH LECTURE"}</span>
                                  </button>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 3. PDF STUDY COVERS TAB DISPLAY */}
                {modalTab === "pdf" && (
                  <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="space-y-4 text-left"
                     key="pdf-panels-dynamic"
                  >
                    {fetchingCourseData ? (
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-3 shadow-sm text-slate-700">
                        <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-[#10b981] animate-spin mx-auto"></div>
                        <p className="text-[#10b981] font-black text-xs tracking-wider animate-pulse uppercase">Fetching Syllabus PDF Notes...</p>
                        <p className="text-slate-400 text-[11px]">Accessing direct static notes warehouse</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 md:p-6 space-y-4 text-slate-800">
                        {/* PDF Documents List */}
                        <div className="space-y-2">
                          {(() => {
                            const list = parsedPdfs.length > 0 ? parsedPdfs : [
                              { id: "fallback-p1", title: "INDEX", link: "https://www.futurekul.com/", topicName: "General Curriculum Syllabus" },
                              { id: "fallback-p2", title: "SSC MTS 2023 01/09/2023 (1st shift)", link: "https://www.futurekul.com/", topicName: "Previous Year Solved Papers" },
                              { id: "fallback-p3", title: "SSC MTS 2023 01/09/2023 (2nd Shift)", link: "https://www.futurekul.com/", topicName: "Previous Year Solved Papers" },
                              { id: "fallback-p4", title: "SSC MTS 2023 01/09/2023 (3rd Shift)", link: "https://www.futurekul.com/", topicName: "Previous Year Solved Papers" },
                              { id: "fallback-p5", title: "SSC MTS 2023 04/09/2023 (1st shift)", link: "https://www.futurekul.com/", topicName: "Previous Year Solved Papers" }
                            ];

                            return list.map((pdf) => (
                              <div 
                                key={pdf.id} 
                                className="bg-white hover:bg-slate-50 p-3.5 rounded-xl border border-slate-200 hover:border-[#38bdf8]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 duration-150 transition-all group shadow-sm"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    <FileText className="w-4.5 h-4.5 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <p className="text-xs sm:text-sm font-extrabold text-slate-800 group-hover:text-emerald-600 transition-colors leading-relaxed break-words">{pdf.title}</p>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    setToastMessage(`Opening lecture note: ${pdf.title}`);
                                    window.open(pdf.link, "_blank");
                                  }}
                                  className="w-full sm:w-auto bg-[#19194d] hover:bg-emerald-600 text-white py-2 px-4 rounded-lg text-xs font-black tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 select-none uppercase shadow-sm whitespace-nowrap"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>OPEN NOTE</span>
                                </button>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

              </div>

            </motion.div>
          ) : (
            /* ====================================================
               NATIVE BATCHES EXPLORE / DIRECTORY GRID VIEW
               ==================================================== */
            <motion.div
              key="directory-list"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Compact Switch & Search Bar Combined */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-4 md:p-5 mb-6" id="controls-panel">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  
                  {/* Live / Record tabs strictly as requested */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded-2xl w-full md:max-w-[360px] shrink-0" id="mode-switcher-container">
                    
                    <button
                      id="live-tab-btn"
                      onClick={() => { 
                        setActiveTab("live"); 
                        setShowFavoritesOnly(false); 
                      }}
                      className={`py-3 px-4 rounded-xl font-extrabold text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2 relative select-none cursor-pointer ${
                        activeTab === "live" && !showFavoritesOnly
                          ? "bg-[#19194d] text-white shadow-md scale-[1.01]"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                    >
                      <span>Live</span>
                      <span className={`text-[10px] md:text-[11px] py-0.5 px-2 rounded-full font-bold shrink-0 ${
                        activeTab === "live" && !showFavoritesOnly ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-700"
                      }`}>
                        {tabCounts.live}
                      </span>
                    </button>

                    <button
                      id="recorded-tab-btn"
                      onClick={() => { 
                        setActiveTab("recorded"); 
                        setShowFavoritesOnly(false); 
                      }}
                      className={`py-3 px-4 rounded-xl font-extrabold text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2 select-none cursor-pointer ${
                        activeTab === "recorded" && !showFavoritesOnly
                          ? "bg-[#19194d] text-white shadow-md scale-[1.01]"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                    >
                      <span>Record</span>
                      <span className={`text-[10px] md:text-[11px] py-0.5 px-2 rounded-full font-bold shrink-0 ${
                        activeTab === "recorded" && !showFavoritesOnly ? "bg-cyan-400 text-slate-950" : "bg-slate-200 text-slate-700"
                      }`}>
                        {tabCounts.recorded}
                      </span>
                    </button>

                  </div>

                  {/* Dynamic Live Search Bar wrapper */}
                  <div className="relative flex-grow" id="search-bar-wrapper">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                    <input
                      id="course-search-input"
                      type="text"
                      placeholder={
                        showFavoritesOnly
                          ? "Search within favorite batches..."
                          : activeTab === "live"
                          ? "Search Live Railway, Science Special..."
                          : "Search Recorded VOD batches..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-[#19194d] focus:outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs md:text-sm transition-all"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>
              </div>

              {/* Dynamic Display Title */}
              <div className="flex items-center justify-between mb-5" id="category-header">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                    {showFavoritesOnly ? (
                      <>
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <span>My Favorite Batches ({totalFavoritesCount})</span>
                      </>
                    ) : activeTab === "live" ? (
                      <>
                        <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Live Batches</span>
                      </>
                    ) : (
                      <>
                        <Tv className="w-4 h-4 text-cyan-500" />
                        <span>Record / VOD Classes</span>
                      </>
                    )}
                    {searchQuery && (
                      <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        "{searchQuery}"
                      </span>
                    )}
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Showing {filteredCourses.length} results
                </span>
              </div>

              {/* Loading State Skeleton */}
              {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="loading-skeletons">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4 animate-pulse">
                      <div className="bg-slate-200 rounded-lg aspect-video w-full"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                      </div>
                      <div className="h-9 bg-slate-200 rounded-lg w-full mt-2"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredCourses.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-sm mx-auto shadow-sm my-6"
                  id="empty-results-box"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">No Courses Found</h3>
                  <p className="text-slate-500 text-xs mb-4">
                    {showFavoritesOnly 
                      ? "You haven't added any batches to favorites yet. Touch the heart icon on any course card to add it here!"
                      : "We couldn't find any courses matching your filters."
                    }
                  </p>
                  <button
                    onClick={() => { 
                      setSearchQuery(""); 
                      setShowFavoritesOnly(false);
                    }}
                    className="bg-[#19194d] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#25256e]"
                  >
                    Reset Filters
                  </button>
                </motion.div>
              )}

              {/* Course Listing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" id="course-list-grid">
                <AnimatePresence mode="popLayout">
                  {filteredCourses.map((course, index) => {
                    const isLiked = localLikedIds[course.id] !== undefined ? localLikedIds[course.id] : course.is_liked === 1;

                    return (
                      <motion.article
                        key={course.id}
                        id={`course-card-${course.id}`}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                        whileHover={{ y: -4, transition: { duration: 0.15 } }}
                        className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-md hover:shadow-xl transition-all flex flex-col relative group"
                      >
                        {/* Badges Overlay */}
                        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 pointer-events-none">
                          {course.is_important === "1" && (
                            <span className="bg-[#df1e1e] text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Best Seller</span>
                            </span>
                          )}
                          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {course.main_cat_name}
                          </span>
                        </div>

                        {/* Heart Favorite Toggle button */}
                        <button 
                          id={`heart-fav-toggle-${course.id}`}
                          onClick={(e) => toggleLike(course.id, e)}
                          className="absolute top-3 right-3 z-20 w-8.5 h-8.5 rounded-full bg-slate-950/40 backdrop-blur-md flex items-center justify-center hover:bg-slate-950/60 active:scale-95 transition-all cursor-pointer border border-white/10 shadow"
                          title={isLiked ? "Remove Favorite" : "Save to Favorites"}
                        >
                          <Heart 
                            className={`w-4.5 h-4.5 transition-all ${
                              isLiked 
                                ? "fill-rose-500 text-rose-500 scale-110 drop-shadow-sm" 
                                : "text-white fill-none hover:scale-105"
                            }`} 
                          />
                        </button>

                        {/* Banner Frame */}
                        <div className="relative overflow-hidden aspect-video bg-slate-50" id={`banner-container-${course.id}`}>
                          <img
                            src={course.banner}
                            alt={course.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60";
                            }}
                          />
                        </div>

                        {/* Info details */}
                        <div className="p-4 md:p-5 flex-grow flex flex-col justify-between" id={`card-body-${course.id}`}>
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-3 font-mono">
                              <div className="text-slate-400 text-[11px]">
                                BATCH ID: {course.id}
                              </div>
                              <div className="text-slate-700 font-semibold bg-slate-50 px-2 py-0.5 rounded text-[10px] md:text-xs">
                                Start: {formatDate(course.start_date.split(" ")[0])}
                              </div>
                            </div>

                            <h3 className="font-bold text-slate-900 group-hover:text-[#19194d] transition-colors leading-snug text-base md:text-lg line-clamp-2 min-h-[3rem] mb-2 text-left" id={`course-title-${course.id}`}>
                              {course.title}
                            </h3>
                          </div>

                          <div className="pt-3 border-t border-slate-100 text-left">
                            <div className="flex items-baseline justify-between mb-3">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl md:text-2xl font-extrabold text-[#df1e1e]">
                                  ₹{course.price}
                                </span>
                                <span className="text-xs text-slate-400 line-through">
                                  ₹{parseInt(course.price) > 800 ? parseInt(course.price) + 500 : 1999}
                                </span>
                              </div>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                Save Extra
                              </span>
                            </div>

                            <button
                              id={`explore-btn-${course.id}`}
                              onClick={() => {
                                setSelectedCourse(course);
                                setModalTab("overview");
                                setPlayingVideo(null);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="w-full bg-[#19194d] hover:bg-[#fdbe14] hover:text-[#19194d] text-white py-3.5 px-6 rounded-xl text-sm font-extrabold tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 group/btn cursor-pointer shadow-sm hover:shadow-md active:scale-98"
                            >
                              <span>Explore Course</span>
                              <ChevronRight className="w-4 h-4 transform group-hover/btn:translate-x-1.5 transition-transform" />
                            </button>
                          </div>

                        </div>

                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating search button - Mobile/Scroll friendly */}
      <AnimatePresence>
        {showFloatingSearch && !selectedCourse && (
          <motion.button
            key="floating-search-fab"
            id="floating-search-fab"
            initial={{ opacity: 0, scale: 0.4, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.4, y: 30 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToSearch}
            className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-[#19194d] text-white flex items-center justify-center shadow-lg hover:shadow-xl cursor-pointer hover:bg-[#fdbe14] hover:text-[#19194d] transition-colors duration-200 border border-[#fdbe14]/40"
            title="Scroll and Search Batches"
          >
            {/* Pulsing glow ring */}
            <span className="absolute -inset-0.5 rounded-full bg-[#fdbe14]/10 animate-ping pointer-events-none"></span>
            <Search className="w-5 h-5 shrink-0 relative z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Interactive Floating Alert Notifications (Toast) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -50, x: "-50%", scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1d1d42] border border-[#fdbe14]/35 text-white py-3.5 px-6 rounded-2xl shadow-2xl flex items-center gap-3 text-xs md:text-sm font-bold font-sans tracking-wide"
          >
            <div className="w-6 h-6 rounded-lg bg-[#fdbe14]/10 flex items-center justify-center text-[#fdbe14]">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Footer section styled beautifully - Single line */}
      <footer className="bg-slate-900 text-slate-400 py-6 px-4 border-t border-slate-800 text-center text-xs" id="main-footer">
        <p>© 2026 Futurekul Coaching Private Limited. All platform rights reserved.</p>
      </footer>

      {/* WhatsApp Community Channel Popup overlay */}
      <WhatsAppPopup />

    </div>
  );
}
