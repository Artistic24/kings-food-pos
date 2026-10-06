export const fcfa = (n: number) => `${Math.round(n).toLocaleString("en-US")} FCFA`;

export const timeOf = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const dateOf = (ts: number) =>
  new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const isSameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

export const makeRef = () => {
  const now = new Date();
  const dayLetter = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(now).slice(0, 1).toUpperCase();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const key = `kings-food-ref-${year}${month}${day}`;
  const next = Number(localStorage.getItem(key) ?? "0") + 1;
  localStorage.setItem(key, String(next));
  return `KF-${dayLetter}${day}${month}${year}-${String(next).padStart(3, "0")}`;
};

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

export const fileToDataUrl = (file: File, max = 800) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Could not prepare image"));
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
