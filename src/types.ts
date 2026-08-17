export interface Course {
  id: string;
  start_date: string;
  end_date: string;
  title: string;
  description: string;
  category: string;
  main_cat_name: string;
  header_name: string;
  banner: string;
  price: string;
  short_description: string;
  is_live: string; // "1" for Live, "0" for Recorded
  image2?: string;
  is_important: string;
  all_banners: string[];
  likes: string;
  comments: string;
  is_liked: number;
  is_buy: null | boolean;
}

export interface ApiResponse {
  state: number;
  msg: string;
  data: Course[];
}

export interface StudyNote {
  id: string;
  classTitle: string;
  timestamp: string;
  content: string;
  createdAt: string;
}

export interface ClassItem {
  title: string;
  link?: string;
  class_link?: string;
  createDate?: string;
  classPdf?: Array<{ title: string; uploadPdf: string }>;
}

export interface UserProgress {
  notes: Record<string, StudyNote[]>;
  completedClasses: Record<string, boolean>;
  walletCoins: number;
  flameStreaks: number;
}

