import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WhatsAppPopupProps {
  channelUrl?: string;
}

export default function WhatsAppPopup({ 
  channelUrl = "https://www.whatsapp.com/channel/0029VbCUE8230LKHYMCduo13" 
}: WhatsAppPopupProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Since the user wants it to appear EVERY refresh or EVERY time the site is opened,
  // we just default our state to `true` on mount. This ensures it displays when the component is rendered.
  if (!isOpen) return null;

  const handleJoin = () => {
    window.open(channelUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        id="whatsapp-portal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          id="whatsapp-modal-container"
          className="relative bg-white text-slate-800 rounded-[32px] p-8 max-w-[390px] w-full shadow-2xl flex flex-col items-center border border-white/50"
        >
          {/* Close corner button */}
          <button
            onClick={() => setIsOpen(false)}
            id="whatsapp-close-icon-btn"
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Centered Graphic Icon representation */}
          <div className="relative mt-2 mb-6 flex items-center justify-center">
            {/* Outer pulse and soft green ring */}
            <div className="w-24 h-24 rounded-full bg-[#e8fbf3] flex items-center justify-center animate-pulse absolute -z-10" />
            <div className="w-24 h-24 rounded-full bg-[#e8fbf3] flex items-center justify-center shadow-inner">
              <div className="w-16 h-16 rounded-full bg-[#25D366] flex items-center justify-center shadow-md transform hover:scale-105 transition-transform duration-200">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-white">
                  <path d="M12.031 2C6.446 2 1.918 6.46 1.914 11.97a10.02 10.02 0 0 0 1.353 5.03L2 22l5.122-1.323a9.95 9.95 0 0 0 4.905 1.282h.004c5.585 0 10.114-4.461 10.118-9.972a9.98 9.98 0 0 0-2.96-7.054A10.06 10.06 0 0 0 12.031 2zm5.727 13.918c-.244.673-1.42 1.253-1.944 1.332-.48.073-.974.137-3.08-.73-2.695-1.107-4.425-3.818-4.56-4.001-.132-.182-1.084-1.423-1.084-2.716 0-1.293.674-1.93.914-2.186.244-.256.533-.32.711-.32.18 0 .356.002.51.01.16.007.373-.061.583.438.214.51.733 1.765.795 1.888.063.123.104.266.02.43-.082.164-.124.266-.245.41-.123.14-.257.315-.367.422-.123.123-.252.257-.109.501.144.244.636 1.033 1.365 1.677.94.83 1.73 1.089 1.975 1.211.246.123.389.102.48-.004.09-.106.39-.452.492-.607.103-.156.205-.13.346-.08.14.048.887.414 1.04.49.155.075.257.111.296.177.038.066.038.38-.206 1.053z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Texts */}
          <h2 id="whatsapp-popup-title" className="text-[#101828] text-2xl font-extrabold text-center tracking-tight mb-2 font-sans leading-none">
            Join Our WhatsApp!
          </h2>
          <p id="whatsapp-popup-desc" className="text-[#475467] text-[14px] text-center leading-relaxed max-w-[280px] mb-8 font-sans font-medium">
            Get the latest updates, exclusive content, and new links if our site gets blocked.
          </p>

          {/* Actions */}
          <div className="w-full flex flex-col gap-3" id="whatsapp-popup-actions">
            <button
              onClick={handleJoin}
              id="whatsapp-join-btn"
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] active:scale-98 text-white font-bold py-4 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all text-[15px] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] text-white shrink-0">
                <path d="M12.031 2C6.446 2 1.918 6.46 1.914 11.97a10.02 10.02 0 0 0 1.353 5.03L2 22l5.122-1.323a9.95 9.95 0 0 0 4.905 1.282h.004c5.585 0 10.114-4.461 10.118-9.972a9.98 9.98 0 0 0-2.96-7.054A10.06 10.06 0 0 0 12.031 2zm5.727 13.918c-.244.673-1.42 1.253-1.944 1.332-.48.073-.974.137-3.08-.73-2.695-1.107-4.425-3.818-4.56-4.001-.132-.182-1.084-1.423-1.084-2.716 0-1.293.674-1.93.914-2.186.244-.256.533-.32.711-.32.18 0 .356.002.51.01.16.007.373-.061.583.438.214.51.733 1.765.795 1.888.063.123.104.266.02.43-.082.164-.124.266-.245.41-.123.14-.257.315-.367.422-.123.123-.252.257-.109.501.144.244.636 1.033 1.365 1.677.94.83 1.73 1.089 1.975 1.211.246.123.389.102.48-.004.09-.106.39-.452.492-.607.103-.156.205-.13.346-.08.14.048.887.414 1.04.49.155.075.257.111.296.177.038.066.038.38-.206 1.053z" />
              </svg>
              <span>Join Channel</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              id="whatsapp-cancel-btn"
              className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] active:scale-98 text-[#475467] hover:text-[#1e293b] font-bold py-4 px-6 rounded-2xl transition-all text-[15px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
