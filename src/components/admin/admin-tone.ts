import type { AdminTone } from "@/lib/admin/mock-data";

export const adminToneStyles: Record<
  AdminTone,
  {
    badge: string;
    panel: string;
    text: string;
    dot: string;
  }
> = {
  accent: {
    badge: "bg-[#E9F1FF] text-[#245BDB] dark:bg-[#12213D] dark:text-[#8FB1FF]",
    panel: "border-[#CFE0FF] bg-[#F7FAFF] dark:border-[#203458] dark:bg-[#101928]",
    text: "text-[#245BDB] dark:text-[#8FB1FF]",
    dot: "bg-[#4E7DFF]"
  },
  success: {
    badge: "bg-[#EAF8F0] text-[#12704D] dark:bg-[#10251D] dark:text-[#6DDFB0]",
    panel: "border-[#CBEBD8] bg-[#F8FFFB] dark:border-[#1D4032] dark:bg-[#0F1C18]",
    text: "text-[#12704D] dark:text-[#6DDFB0]",
    dot: "bg-[#21B47E]"
  },
  warning: {
    badge: "bg-[#FFF6E8] text-[#A06100] dark:bg-[#2A1C0A] dark:text-[#F4C56D]",
    panel: "border-[#F1D6A0] bg-[#FFFDF8] dark:border-[#4A3413] dark:bg-[#1C1610]",
    text: "text-[#A06100] dark:text-[#F4C56D]",
    dot: "bg-[#F0A52C]"
  },
  danger: {
    badge: "bg-[#FFF0F0] text-[#B44141] dark:bg-[#2B1515] dark:text-[#FF9A9A]",
    panel: "border-[#EAB4B4] bg-[#FFF9F9] dark:border-[#512626] dark:bg-[#1E1111]",
    text: "text-[#B44141] dark:text-[#FF9A9A]",
    dot: "bg-[#E66363]"
  },
  neutral: {
    badge: "bg-muted text-card-foreground dark:bg-surface dark:text-muted-foreground",
    panel: "border-border bg-card dark:border-border dark:bg-[#121922]",
    text: "text-card-foreground dark:text-white",
    dot: "bg-muted-foreground"
  }
};
